import { NextRequest, NextResponse } from 'next/server';
import { requireTenant } from '@/lib/tenant';
import { prisma } from '@/lib/prisma';

// DELETE — Disconnect (deactivate) an account
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ accountId: string }> }
) {
  const ctx = await requireTenant();
  if (ctx instanceof NextResponse) return ctx;

  const { accountId } = await params;

  const account = await prisma.socialAccount.findFirst({
    where: { id: accountId, tenantId: ctx.tenantId },
  });

  if (!account) {
    return NextResponse.json({ error: 'Account not found' }, { status: 404 });
  }

  // Deactivate the account and its bot(s)
  await prisma.$transaction([
    prisma.socialAccount.update({
      where: { id: accountId },
      data: { isActive: false },
    }),
    prisma.bot.updateMany({
      where: { accountId, tenantId: ctx.tenantId },
      data: { isActive: false },
    }),
  ]);

  return NextResponse.json({ success: true });
}
