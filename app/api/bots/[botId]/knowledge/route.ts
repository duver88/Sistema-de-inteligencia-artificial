import { NextRequest, NextResponse } from 'next/server';
import { requireTenant } from '@/lib/tenant';
import { prisma } from '@/lib/prisma';

type Params = { params: Promise<{ botId: string }> };

// GET — List knowledge entries for a bot
export async function GET(_req: NextRequest, { params }: Params) {
  const ctx = await requireTenant();
  if (ctx instanceof NextResponse) return ctx;

  const { botId } = await params;

  const bot = await prisma.bot.findFirst({
    where: { id: botId, tenantId: ctx.tenantId },
  });
  if (!bot) return NextResponse.json({ error: 'Bot not found' }, { status: 404 });

  const entries = await prisma.knowledgeEntry.findMany({
    where: { botId },
    include: { project: { select: { name: true } } },
    orderBy: [{ projectId: 'asc' }, { order: 'asc' }],
  });

  return NextResponse.json({ entries });
}

// POST — Add a knowledge entry
export async function POST(request: NextRequest, { params }: Params) {
  const ctx = await requireTenant();
  if (ctx instanceof NextResponse) return ctx;

  const { botId } = await params;

  const bot = await prisma.bot.findFirst({
    where: { id: botId, tenantId: ctx.tenantId },
  });
  if (!bot) return NextResponse.json({ error: 'Bot not found' }, { status: 404 });

  const body = (await request.json().catch(() => null)) as {
    key?: string;
    value?: string;
    category?: string;
    projectId?: string;
    order?: number;
  } | null;

  const key = typeof body?.key === 'string' ? body.key.trim() : '';
  const value = typeof body?.value === 'string' ? body.value.trim() : '';
  if (!key || !value) {
    return NextResponse.json({ error: 'key and value are required' }, { status: 400 });
  }

  // Referential integrity: a provided projectId must belong to THIS bot
  // (which is already verified to belong to this tenant). Otherwise a tenant
  // could attach entries to another tenant's Project.
  if (body?.projectId) {
    const project = await prisma.project.findFirst({
      where: { id: body.projectId, botId },
      select: { id: true },
    });
    if (!project) {
      return NextResponse.json(
        { error: 'Project not found for this bot' },
        { status: 400 }
      );
    }
  }

  const entry = await prisma.knowledgeEntry.create({
    data: {
      botId,
      key,
      value,
      category: body?.category,
      projectId: body?.projectId,
      order: body?.order ?? 0,
    },
  });

  return NextResponse.json({ entry }, { status: 201 });
}

// PATCH — Update a knowledge entry
export async function PATCH(request: NextRequest, { params }: Params) {
  const ctx = await requireTenant();
  if (ctx instanceof NextResponse) return ctx;

  const { botId } = await params;
  const { searchParams } = new URL(request.url);
  const entryId = searchParams.get('entryId');

  if (!entryId) return NextResponse.json({ error: 'entryId required' }, { status: 400 });

  const bot = await prisma.bot.findFirst({
    where: { id: botId, tenantId: ctx.tenantId },
  });
  if (!bot) return NextResponse.json({ error: 'Bot not found' }, { status: 404 });

  const body = await request.json() as {
    key?: string;
    value?: string;
    category?: string;
  };

  const entry = await prisma.knowledgeEntry.updateMany({
    where: { id: entryId, botId },
    data: {
      ...(body.key !== undefined && { key: body.key }),
      ...(body.value !== undefined && { value: body.value }),
      ...(body.category !== undefined && { category: body.category }),
    },
  });

  return NextResponse.json({ success: true, count: entry.count });
}

// DELETE — Remove a knowledge entry (by ID in query param)
export async function DELETE(request: NextRequest, { params }: Params) {
  const ctx = await requireTenant();
  if (ctx instanceof NextResponse) return ctx;

  const { botId } = await params;
  const { searchParams } = new URL(request.url);
  const entryId = searchParams.get('entryId');

  if (!entryId) return NextResponse.json({ error: 'entryId required' }, { status: 400 });

  const bot = await prisma.bot.findFirst({
    where: { id: botId, tenantId: ctx.tenantId },
  });
  if (!bot) return NextResponse.json({ error: 'Bot not found' }, { status: 404 });

  await prisma.knowledgeEntry.deleteMany({
    where: { id: entryId, botId },
  });

  return NextResponse.json({ success: true });
}
