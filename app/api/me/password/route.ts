import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { requireTenant } from '@/lib/tenant';
import { prisma } from '@/lib/prisma';

// POST — change the current user's password.
// Body: { currentPassword, newPassword }. Verifies the current password,
// requires the new one to be at least 8 characters, then stores the new
// hash and clears the mustChangePassword flag.
export async function POST(request: NextRequest) {
  const ctx = await requireTenant();
  if (ctx instanceof NextResponse) return ctx;

  const body = await request.json().catch(() => null) as
    | { currentPassword?: string; newPassword?: string }
    | null;

  const currentPassword = typeof body?.currentPassword === 'string' ? body.currentPassword : '';
  const newPassword = typeof body?.newPassword === 'string' ? body.newPassword : '';

  if (!currentPassword || !newPassword) {
    return NextResponse.json(
      { error: 'currentPassword and newPassword are required' },
      { status: 400 }
    );
  }

  if (newPassword.length < 8) {
    return NextResponse.json(
      { error: 'New password must be at least 8 characters' },
      { status: 400 }
    );
  }

  const user = await prisma.user.findUnique({
    where: { id: ctx.userId },
    select: { passwordHash: true },
  });

  if (!user?.passwordHash) {
    return NextResponse.json(
      { error: 'Password login is not enabled for this account' },
      { status: 400 }
    );
  }

  const valid = await bcrypt.compare(currentPassword, user.passwordHash);
  if (!valid) {
    return NextResponse.json(
      { error: 'Current password is incorrect' },
      { status: 400 }
    );
  }

  const passwordHash = await bcrypt.hash(newPassword, 12);

  // passwordChangedAt invalidates every JWT issued before this change (this
  // session included) — the user signs in again with the new password.
  await prisma.user.update({
    where: { id: ctx.userId },
    data: { passwordHash, mustChangePassword: false, passwordChangedAt: new Date() },
  });

  return NextResponse.json({ ok: true });
}
