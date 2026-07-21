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
  accessExpiresAt: true,
  tenant: { select: { id: true, name: true, plan: true } },
} as const;

// GET — Full detail for a single user (super admin only). Returns the user,
// its tenant (with an "OpenAI key configured" flag — NEVER the key itself),
// the tenant's connected social accounts and its bots. Page tokens and the
// encrypted OpenAI API key are never included in the response.
export async function GET(_req: NextRequest, { params }: Params) {
  const ctx = await requireSuperAdmin();
  if (ctx instanceof NextResponse) return ctx;

  const { userId } = await params;

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      name: true,
      email: true,
      status: true,
      isSuperAdmin: true,
      mustChangePassword: true,
      lastLoginAt: true,
      createdAt: true,
      accessExpiresAt: true,
      tenantId: true,
      tenant: {
        select: {
          id: true,
          name: true,
          plan: true,
          openaiApiKey: true, // mapped to a boolean below, value never returned
          openaiKeySetAt: true,
        },
      },
    },
  });
  if (!user) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 });
  }

  const [accounts, bots] = user.tenantId
    ? await Promise.all([
        prisma.socialAccount.findMany({
          where: { tenantId: user.tenantId },
          select: {
            id: true,
            platform: true,
            pageName: true,
            pictureUrl: true,
            isActive: true,
            webhookSubscribed: true,
            connectedAt: true,
          },
          orderBy: { connectedAt: 'desc' },
        }),
        prisma.bot.findMany({
          where: { tenantId: user.tenantId },
          select: {
            id: true,
            name: true,
            isActive: true,
            aiModel: true,
            account: { select: { pageName: true } },
            _count: { select: { comments: true } },
          },
          orderBy: { name: 'asc' },
        }),
      ])
    : [[], []];

  return NextResponse.json({
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      status: user.status,
      isSuperAdmin: user.isSuperAdmin,
      mustChangePassword: user.mustChangePassword,
      lastLoginAt: user.lastLoginAt,
      createdAt: user.createdAt,
      accessExpiresAt: user.accessExpiresAt,
    },
    tenant: user.tenant
      ? {
          id: user.tenant.id,
          name: user.tenant.name,
          plan: user.tenant.plan,
          openaiKeySet: user.tenant.openaiApiKey !== null,
          openaiKeySetAt: user.tenant.openaiKeySetAt,
        }
      : null,
    accounts,
    bots: bots.map((bot) => ({
      id: bot.id,
      name: bot.name,
      isActive: bot.isActive,
      aiModel: bot.aiModel,
      pageName: bot.account.pageName,
      commentCount: bot._count.comments,
    })),
  });
}

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
    accessExpiresAt?: unknown;
  } | null;

  if (!body) {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  const target = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, email: true, status: true, isSuperAdmin: true, tenantId: true },
  });
  if (!target) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 });
  }

  const data: {
    name?: string;
    email?: string;
    status?: UserStatus;
    isSuperAdmin?: boolean;
    accessExpiresAt?: Date | null;
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
    // Anti-brick guard: admins created via userType 'ADMIN' have no tenant.
    // Demoting such a user would leave an account with neither a tenant nor
    // the super-admin flag — getCurrentTenant() returns null for it, so every
    // API responds 401 and every dashboard page renders blank. Reject it.
    if (body.isSuperAdmin === false && target.isSuperAdmin && !target.tenantId) {
      return NextResponse.json(
        {
          error:
            'This administrator has no tenant and cannot be demoted to a regular user. Demoting them would leave the account unable to access anything.',
        },
        { status: 400 }
      );
    }
    data.isSuperAdmin = body.isSuperAdmin;
  }

  if (body.accessExpiresAt !== undefined) {
    // Anti-lockout: expiration dates can never be set on yourself or on any
    // super admin — super admins never expire. Clearing (null) is always
    // allowed, and a date may accompany a demotion (isSuperAdmin: false) in
    // the same request, so demote+clear / demote+set stay atomic.
    if (userId === ctx.userId) {
      return NextResponse.json(
        { error: 'You cannot change your own access expiration date' },
        { status: 400 }
      );
    }
    if (
      body.accessExpiresAt !== null &&
      (data.isSuperAdmin === true || (target.isSuperAdmin && data.isSuperAdmin !== false))
    ) {
      return NextResponse.json(
        { error: 'Super admin accounts cannot have an access expiration date' },
        { status: 400 }
      );
    }
    if (body.accessExpiresAt === null) {
      data.accessExpiresAt = null;
    } else {
      if (typeof body.accessExpiresAt !== 'string') {
        return NextResponse.json(
          { error: 'accessExpiresAt must be an ISO date string or null' },
          { status: 400 }
        );
      }
      const parsed = new Date(body.accessExpiresAt);
      if (Number.isNaN(parsed.getTime())) {
        return NextResponse.json(
          { error: 'accessExpiresAt is not a valid date' },
          { status: 400 }
        );
      }
      data.accessExpiresAt = parsed;
    }
  }

  // Promotion to super admin always clears any stored expiration date so a
  // stale (and invisible — the UI shows "No limit" for admins) date cannot
  // silently re-arm and lock the user out on a later demotion.
  if (data.isSuperAdmin === true) {
    data.accessExpiresAt = null;
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
      // Tenant→SocialAccount, Tenant→Bot, Tenant→CommentLog and Tenant→AiUsage
      // are all Restrict relations: deleting a tenant that still holds ANY of
      // them would throw P2003 and roll back the whole transaction. Only
      // delete the tenant when it has no meaningful data; otherwise leave it
      // orphaned. AiUsage rows are pure billing aggregates (they can exist
      // without any CommentLog, e.g. from knowledge imports), so instead of
      // blocking the deletion they are removed together with the tenant.
      const [remainingUsers, socialAccounts, bots, comments] = await Promise.all([
        tx.user.count({ where: { tenantId: target.tenantId } }),
        tx.socialAccount.count({ where: { tenantId: target.tenantId } }),
        tx.bot.count({ where: { tenantId: target.tenantId } }),
        tx.commentLog.count({ where: { tenantId: target.tenantId } }),
      ]);

      if (remainingUsers === 0) {
        if (socialAccounts === 0 && bots === 0 && comments === 0) {
          await tx.aiUsage.deleteMany({ where: { tenantId: target.tenantId } });
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
