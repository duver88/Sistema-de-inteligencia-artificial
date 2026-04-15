import { NextRequest, NextResponse } from 'next/server';
import { requireTenant } from '@/lib/tenant';
import { prisma } from '@/lib/prisma';

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ botId: string }> }
) {
  const ctx = await requireTenant();
  if (ctx instanceof NextResponse) return ctx;

  const { botId } = await params;

  const bot = await prisma.bot.findFirst({
    where: { id: botId, tenantId: ctx.tenantId },
  });
  if (!bot) return NextResponse.json({ error: 'Bot not found' }, { status: 404 });

  const updated = await prisma.bot.update({
    where: { id: botId },
    data: { isActive: !bot.isActive },
  });

  return NextResponse.json({ isActive: updated.isActive });
}
