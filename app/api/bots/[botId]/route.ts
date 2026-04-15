import { NextRequest, NextResponse } from 'next/server';
import { requireTenant } from '@/lib/tenant';
import { prisma } from '@/lib/prisma';

type Params = { params: Promise<{ botId: string }> };

// GET — Get a single bot with full config
export async function GET(_req: NextRequest, { params }: Params) {
  const ctx = await requireTenant();
  if (ctx instanceof NextResponse) return ctx;

  const { botId } = await params;

  const bot = await prisma.bot.findFirst({
    where: { id: botId, tenantId: ctx.tenantId },
    include: {
      account: {
        select: { platform: true, pageName: true, pictureUrl: true, pageId: true },
      },
      projects: { orderBy: { createdAt: 'asc' } },
      knowledgeEntries: { orderBy: { order: 'asc' } },
    },
  });

  if (!bot) return NextResponse.json({ error: 'Bot not found' }, { status: 404 });

  return NextResponse.json({ bot });
}

// PATCH — Update bot settings
export async function PATCH(request: NextRequest, { params }: Params) {
  const ctx = await requireTenant();
  if (ctx instanceof NextResponse) return ctx;

  const { botId } = await params;

  const bot = await prisma.bot.findFirst({
    where: { id: botId, tenantId: ctx.tenantId },
  });
  if (!bot) return NextResponse.json({ error: 'Bot not found' }, { status: 404 });

  const body = await request.json() as Partial<{
    name: string;
    isActive: boolean;
    autoReply: boolean;
    deleteNegative: boolean;
    hideSpam: boolean;
    aiEnabled: boolean;
    replyMaxChars: number;
    replyTone: string;
    language: string;
    systemInstructions: string;
    deleteKeywords: string[];
    spamKeywords: string[];
    deleteInstructions: string;
    spamInstructions: string;
  }>;

  // openaiApiKey is managed exclusively via /api/settings/openai — never via bot PATCH
  const { ...safeBody } = body;

  const updated = await prisma.bot.update({
    where: { id: botId },
    data: safeBody,
  });

  return NextResponse.json({ bot: updated });
}

// DELETE — Delete a bot
export async function DELETE(_req: NextRequest, { params }: Params) {
  const ctx = await requireTenant();
  if (ctx instanceof NextResponse) return ctx;

  const { botId } = await params;

  const bot = await prisma.bot.findFirst({
    where: { id: botId, tenantId: ctx.tenantId },
  });
  if (!bot) return NextResponse.json({ error: 'Bot not found' }, { status: 404 });

  await prisma.bot.delete({ where: { id: botId } });
  return NextResponse.json({ success: true });
}
