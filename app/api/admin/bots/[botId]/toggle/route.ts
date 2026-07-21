import { NextRequest, NextResponse } from 'next/server';
import { requireSuperAdmin } from '@/lib/tenant';
import { prisma } from '@/lib/prisma';
import { recordAudit, AUDIT_ACTIONS } from '@/lib/audit';

type Params = { params: Promise<{ botId: string }> };

// POST /api/admin/bots/[botId]/toggle — invert a bot's isActive flag (super
// admin only). Records a 'bot.toggle' audit entry and returns { isActive }.
// Contract E.
export async function POST(_req: NextRequest, { params }: Params) {
  const ctx = await requireSuperAdmin();
  if (ctx instanceof NextResponse) return ctx;

  const { botId } = await params;

  const bot = await prisma.bot.findUnique({
    where: { id: botId },
    select: { id: true, name: true, isActive: true, tenantId: true },
  });
  if (!bot) {
    return NextResponse.json({ error: 'Bot not found' }, { status: 404 });
  }

  const nextActive = !bot.isActive;

  const updated = await prisma.bot.update({
    where: { id: botId },
    data: { isActive: nextActive },
    select: { isActive: true },
  });

  const actor = await prisma.user.findUnique({
    where: { id: ctx.userId },
    select: { email: true },
  });
  await recordAudit({
    actorId: ctx.userId,
    actorEmail: actor?.email ?? '',
    action: AUDIT_ACTIONS.BOT_TOGGLE,
    targetType: 'bot',
    targetId: botId,
    metadata: {
      botName: bot.name,
      tenantId: bot.tenantId,
      from: bot.isActive,
      to: updated.isActive,
    },
  });

  return NextResponse.json({ isActive: updated.isActive });
}
