import { NextRequest, NextResponse } from 'next/server';
import { requireSuperAdmin } from '@/lib/tenant';
import { prisma } from '@/lib/prisma';
import type { UserStatus } from '@/lib/generated/prisma/client';

type Params = { params: Promise<{ userId: string }> };

const EMAIL_REGEX = /^\S+@\S+\.\S+$/;
const VALID_STATUSES: UserStatus[] = ['ACTIVE', 'SUSPENDED'];

// Thrown inside the PATCH transaction when the update would leave the
// platform with zero active super admins.
class LastSuperAdminError extends Error {}

const USER_SELECT = {
  id: true,
  name: true,
  email: true,
  status: true,
  isSuperAdmin: true,
  mustChangePassword: true,
  lastLoginAt: true,
  createdAt: true,
  tenant: { select: { id: true, name: true, plan: true } },
} as const;

// PATCH — Partially update a user (super admin only)
export async function PATCH(request: NextRequest, { params }: Params) {
  const ctx = await requireSuperAdmin();
  if (ctx instanceof NextResponse) return ctx;

  const { userId } = await params;

  const body = (await request.json().catch(() => null)) as {
    name?: unknown;
    email?: unknown;
    status?: unknown;
    isSuperAdmin?: unknown;
  } | null;

  if (!body) {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  const target = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, email: true, status: true, isSuperAdmin: true },
  });
  if (!target) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 });
  }

  const data: {
    name?: string;
    email?: string;
    status?: UserStatus;
    isSuperAdmin?: boolean;
  } = {};

  if (body.name !== undefined) {
    if (typeof body.name !== 'string' || !body.name.trim()) {
      return NextResponse.json({ error: 'Name cannot be empty' }, { status: 400 });
    }
    data.name = body.name.trim();
  }

  if (body.email !== undefined) {
    if (typeof body.email !== 'string') {
      return NextResponse.json({ error: 'A valid email is required' }, { status: 400 });
    }
    const email = body.email.trim().toLowerCase();
    if (!EMAIL_REGEX.test(email)) {
      return NextResponse.json({ error: 'A valid email is required' }, { status: 400 });
    }
    if (email !== target.email) {
      const existing = await prisma.user.findUnique({ where: { email } });
      if (existing) {
        return NextResponse.json(
          { error: 'A user with this email already exists' },
          { status: 409 }
        );
      }
    }
    data.email = email;
  }

  if (body.status !== undefined) {
    if (
      typeof body.status !== 'string' ||
      !VALID_STATUSES.includes(body.status as UserStatus)
    ) {
      return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
    }
    data.status = body.status as UserStatus;
  }

  if (body.isSuperAdmin !== undefined) {
    if (typeof body.isSuperAdmin !== 'boolean') {
      return NextResponse.json({ error: 'Invalid isSuperAdmin value' }, { status: 400 });
    }
    data.isSuperAdmin = body.isSuperAdmin;
  }

  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 });
  }

  // Anti-lockout: you cannot change your own status or super-admin flag
  if (userId === ctx.userId && (data.status !== undefined || data.isSuperAdmin !== undefined)) {
    return NextResponse.json(
      { error: 'You cannot change your own status or super-admin flag' },
      { status: 400 }
    );
  }

  const losesSuperAdmin = data.isSuperAdmin === false;
  const becomesSuspended = data.status === 'SUSPENDED';

  try {
    const updated = await prisma.$transaction(
      async (tx) => {
        // Anti-lockout: never demote or suspend the last active super admin.
        // Re-checked INSIDE a Serializable transaction so two concurrent
        // PATCHes (e.g. two super admins demoting each other) cannot both
        // pass the guard and leave zero active super admins (TOCTOU).
        if (losesSuperAdmin || becomesSuspended) {
          const freshTarget = await tx.user.findUnique({
            where: { id: userId },
            select: { isSuperAdmin: true, status: true },
          });
          if (
            freshTarget?.isSuperAdmin &&
            freshTarget.status === 'ACTIVE'
          ) {
            const otherActiveSuperAdmins = await tx.user.count({
              where: { isSuperAdmin: true, status: 'ACTIVE', id: { not: userId } },
            });
            if (otherActiveSuperAdmins === 0) {
              throw new LastSuperAdminError();
            }
          }
        }

        return tx.user.update({
          where: { id: userId },
          data,
          select: USER_SELECT,
        });
      },
      { isolationLevel: 'Serializable' }
    );

    return NextResponse.json({ user: updated });
  } catch (err) {
    if (err instanceof LastSuperAdminError) {
      return NextResponse.json(
        { error: 'Cannot suspend or demote the last active super admin' },
        { status: 400 }
      );
    }
    const code = (err as { code?: string })?.code;
    // Unique constraint race on email (P2002) — mirror the POST route
    if (code === 'P2002') {
      return NextResponse.json(
        { error: 'A user with this email already exists' },
        { status: 409 }
      );
    }
    // Target deleted concurrently
    if (code === 'P2025') {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }
    // Serialization conflict with a concurrent update — ask the client to retry
    if (code === 'P2034') {
      return NextResponse.json(
        { error: 'The user was modified by another request. Please retry.' },
        { status: 409 }
      );
    }
    throw err;
  }
}

// DELETE — Delete a user (super admin only). Also removes the tenant when the
// user was its only member and the tenant has no connected social accounts.
export async function DELETE(_req: NextRequest, { params }: Params) {
  const ctx = await requireSuperAdmin();
  if (ctx instanceof NextResponse) return ctx;

  const { userId } = await params;

  const target = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, isSuperAdmin: true, tenantId: true },
  });
  if (!target) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 });
  }
  if (target.id === ctx.userId) {
    return NextResponse.json(
      { error: 'You cannot delete your own account' },
      { status: 400 }
    );
  }
  if (target.isSuperAdmin) {
    return NextResponse.json(
      { error: 'Super admin accounts cannot be deleted' },
      { status: 400 }
    );
  }

  const result = await prisma.$transaction(async (tx) => {
    await tx.session.deleteMany({ where: { userId } });
    await tx.account.deleteMany({ where: { userId } });
    await tx.user.delete({ where: { id: userId } });

    let tenantDeleted = false;
    let tenantOrphaned = false;

    if (target.tenantId) {
      // Tenant→SocialAccount, Tenant→Bot and Tenant→CommentLog are all
      // Restrict relations: deleting a tenant that still holds ANY of them
      // would throw P2003 and roll back the whole transaction. Only delete
      // the tenant when it has no data at all; otherwise leave it orphaned.
      const [remainingUsers, socialAccounts, bots, comments] = await Promise.all([
        tx.user.count({ where: { tenantId: target.tenantId } }),
        tx.socialAccount.count({ where: { tenantId: target.tenantId } }),
        tx.bot.count({ where: { tenantId: target.tenantId } }),
        tx.commentLog.count({ where: { tenantId: target.tenantId } }),
      ]);

      if (remainingUsers === 0) {
        if (socialAccounts === 0 && bots === 0 && comments === 0) {
          await tx.tenant.delete({ where: { id: target.tenantId } });
          tenantDeleted = true;
        } else {
          // Tenant still has connected pages/data — keep it (orphaned)
          tenantOrphaned = true;
        }
      }
    }

    return { tenantDeleted, tenantOrphaned };
  });

  return NextResponse.json({
    ok: true,
    tenantDeleted: result.tenantDeleted,
    tenantOrphaned: result.tenantOrphaned,
    ...(result.tenantOrphaned && {
      message: 'The user was deleted, but their tenant still has connected data and was left orphaned.',
    }),
  });
}
