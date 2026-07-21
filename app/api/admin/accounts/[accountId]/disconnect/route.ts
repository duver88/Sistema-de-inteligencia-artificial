import { NextRequest, NextResponse } from 'next/server';
import { requireSuperAdmin } from '@/lib/tenant';
import { prisma } from '@/lib/prisma';
import { recordAudit, AUDIT_ACTIONS } from '@/lib/audit';

type Params = { params: Promise<{ accountId: string }> };

// POST /api/admin/accounts/[accountId]/disconnect — deactivate a connected
// page and all of its bots (super admin only). Does NOT delete anything and
// never touches the page token. Records an 'account.disconnect' audit entry.
// Contract D.
export async function POST(_req: NextRequest, { params }: Params) {
  const ctx = await requireSuperAdmin();
  if (ctx instanceof NextResponse) return ctx;

  const { accountId } = await params;

  const account = await prisma.socialAccount.findUnique({
    where: { id: accountId },
    select: { id: true, pageName: true, isActive: true, tenantId: true },
  });
  if (!account) {
    return NextResponse.json({ error: 'Account not found' }, { status: 404 });
  }

  const result = await prisma.$transaction(async (tx) => {
    await tx.socialAccount.update({
      where: { id: accountId },
      data: { isActive: false },
    });
    const bots = await tx.bot.updateMany({
      where: { accountId },
      data: { isActive: false },
    });
    return { botsDeactivated: bots.count };
  });

  const actor = await prisma.user.findUnique({
    where: { id: ctx.userId },
    select: { email: true },
  });
  await recordAudit({
    actorId: ctx.userId,
    actorEmail: actor?.email ?? '',
    action: AUDIT_ACTIONS.ACCOUNT_DISCONNECT,
    targetType: 'account',
    targetId: accountId,
    metadata: {
      pageName: account.pageName,
      tenantId: account.tenantId,
      botsDeactivated: result.botsDeactivated,
    },
  });

  return NextResponse.json({
    ok: true,
    isActive: false,
    botsDeactivated: result.botsDeactivated,
  });
}
