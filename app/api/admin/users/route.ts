import { NextRequest, NextResponse } from 'next/server';
import { requireSuperAdmin } from '@/lib/tenant';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';

const EMAIL_REGEX = /^\S+@\S+\.\S+$/;

// GET — List all users with their tenant and usage stats (super admin only)
export async function GET() {
  const ctx = await requireSuperAdmin();
  if (ctx instanceof NextResponse) return ctx;

  const users = await prisma.user.findMany({
    select: {
      id: true,
      name: true,
      email: true,
      status: true,
      isSuperAdmin: true,
      mustChangePassword: true,
      lastLoginAt: true,
      createdAt: true,
      tenant: {
        select: {
          id: true,
          name: true,
          plan: true,
          _count: {
            select: { accounts: true, bots: true, comments: true },
          },
        },
      },
    },
    orderBy: { createdAt: 'asc' },
  });

  return NextResponse.json({
    users: users.map((user) => ({
      id: user.id,
      name: user.name,
      email: user.email,
      status: user.status,
      isSuperAdmin: user.isSuperAdmin,
      mustChangePassword: user.mustChangePassword,
      lastLoginAt: user.lastLoginAt,
      createdAt: user.createdAt,
      tenant: user.tenant
        ? { id: user.tenant.id, name: user.tenant.name, plan: user.tenant.plan }
        : null,
      stats: {
        accounts: user.tenant?._count.accounts ?? 0,
        bots: user.tenant?._count.bots ?? 0,
        comments: user.tenant?._count.comments ?? 0,
      },
    })),
  });
}

// POST — Create a new Tenant + User with a temporary password (super admin only)
export async function POST(request: NextRequest) {
  const ctx = await requireSuperAdmin();
  if (ctx instanceof NextResponse) return ctx;

  const body = (await request.json().catch(() => null)) as {
    name?: unknown;
    email?: unknown;
    password?: unknown;
  } | null;

  const name = typeof body?.name === 'string' ? body.name.trim() : '';
  const email = typeof body?.email === 'string' ? body.email.trim().toLowerCase() : '';
  const password = typeof body?.password === 'string' ? body.password : '';

  if (!name) {
    return NextResponse.json({ error: 'Name is required' }, { status: 400 });
  }
  if (!email || !EMAIL_REGEX.test(email)) {
    return NextResponse.json({ error: 'A valid email is required' }, { status: 400 });
  }
  if (password.length < 8) {
    return NextResponse.json(
      { error: 'Password must be at least 8 characters' },
      { status: 400 }
    );
  }

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return NextResponse.json(
      { error: 'A user with this email already exists' },
      { status: 409 }
    );
  }

  const passwordHash = await bcrypt.hash(password, 12);

  try {
    const user = await prisma.$transaction(async (tx) => {
      const tenant = await tx.tenant.create({ data: { name } });
      return tx.user.create({
        data: {
          name,
          email,
          passwordHash,
          tenantId: tenant.id,
          role: 'OWNER',
          mustChangePassword: true,
        },
        select: {
          id: true,
          name: true,
          email: true,
          status: true,
          isSuperAdmin: true,
          mustChangePassword: true,
          lastLoginAt: true,
          createdAt: true,
          tenant: { select: { id: true, name: true, plan: true } },
        },
      });
    });

    return NextResponse.json(
      { user: { ...user, stats: { accounts: 0, bots: 0, comments: 0 } } },
      { status: 201 }
    );
  } catch (err) {
    // Unique constraint race on email (P2002)
    if ((err as { code?: string })?.code === 'P2002') {
      return NextResponse.json(
        { error: 'A user with this email already exists' },
        { status: 409 }
      );
    }
    throw err;
  }
}
