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

  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body || typeof body !== 'object') {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  // Strict allowlist. Only these fields may be updated via PATCH — never
  // aiModel (billed against the platform key), tenantId or accountId (would
  // break tenant isolation). Each is type-checked before it reaches Prisma.
  const data: Record<string, unknown> = {};
  const asBool = (v: unknown) => (typeof v === 'boolean' ? v : undefined);
  const asStr = (v: unknown) => (typeof v === 'string' ? v : undefined);
  const asStrArr = (v: unknown) =>
    Array.isArray(v) && v.every((x) => typeof x === 'string') ? v : undefined;

  if ('name' in body) {
    const name = asStr(body.name)?.trim();
    if (!name) return NextResponse.json({ error: 'Name cannot be empty' }, { status: 400 });
    data.name = name;
  }
  for (const key of ['isActive', 'autoReply', 'deleteNegative', 'hideSpam', 'aiEnabled'] as const) {
    if (key in body) {
      const v = asBool(body[key]);
      if (v === undefined) return NextResponse.json({ error: `${key} must be a boolean` }, { status: 400 });
      data[key] = v;
    }
  }
  for (const key of ['replyTone', 'language', 'systemInstructions', 'deleteInstructions', 'spamInstructions'] as const) {
    if (key in body) {
      const v = asStr(body[key]);
      if (v === undefined) return NextResponse.json({ error: `${key} must be a string` }, { status: 400 });
      data[key] = v;
    }
  }
  if ('replyMaxChars' in body) {
    const n = body.replyMaxChars;
    if (typeof n !== 'number' || !Number.isInteger(n) || n < 1 || n > 2000) {
      return NextResponse.json({ error: 'replyMaxChars must be an integer between 1 and 2000' }, { status: 400 });
    }
    data.replyMaxChars = n;
  }
  for (const key of ['deleteKeywords', 'spamKeywords'] as const) {
    if (key in body) {
      const v = asStrArr(body[key]);
      if (v === undefined) return NextResponse.json({ error: `${key} must be an array of strings` }, { status: 400 });
      data[key] = v;
    }
  }

  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 });
  }

  const updated = await prisma.bot.update({
    where: { id: botId },
    data,
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
