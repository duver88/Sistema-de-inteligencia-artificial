import { NextRequest, NextResponse } from 'next/server';
import { requireSuperAdmin } from '@/lib/tenant';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';

type Params = { params: Promise<{ userId: string }> };

// POST — Set a new temporary password for a user (super admin only).
// The user will be forced to change it on their next login.
export async function POST(request: NextRequest, { params }: Params) {
  const ctx = await requireSuperAdmin();
  if (ctx instanceof NextResponse) return ctx;

  const { userId } = await params;

  const body = (await request.json().catch(() => null)) as {
    password?: unknown;
  } | null;

  const password = typeof body?.password === 'string' ? body.password : '';
  if (password.length < 8) {
    return NextResponse.json(
      { error: 'Password must be at least 8 characters' },
      { status: 400 }
    );
  }

  const target = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true },
  });
  if (!target) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 });
  }

  const passwordHash = await bcrypt.hash(password, 12);

  // passwordChangedAt invalidates every JWT issued before this reset, so a
  // compromised session cannot outlive the password rotation.
  await prisma.user.update({
    where: { id: userId },
    data: { passwordHash, mustChangePassword: true, passwordChangedAt: new Date() },
  });

  return NextResponse.json({ ok: true });
}
