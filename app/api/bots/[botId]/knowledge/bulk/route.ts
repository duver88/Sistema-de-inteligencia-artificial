import { NextRequest, NextResponse } from 'next/server';
import { requireTenant } from '@/lib/tenant';
import { prisma } from '@/lib/prisma';

type Params = { params: Promise<{ botId: string }> };

const MAX_ENTRIES = 5000;
const MAX_KEY_LENGTH = 300;
const MAX_VALUE_LENGTH = 10000;

interface IncomingEntry {
  key?: unknown;
  value?: unknown;
  category?: unknown;
  project?: unknown;
}

// POST — Write many knowledge entries at once.
//
// `mode: 'replace'` wipes the bot's knowledge base and writes the payload in
// its place, which is what makes export → import round-trip to an identical
// knowledge base. `mode: 'append'` keeps what is already there and adds to it.
//
// Doing this in one request (and one transaction) instead of one POST per entry
// also means a half-finished import can never leave the bot with a partially
// replaced knowledge base.
export async function POST(request: NextRequest, { params }: Params) {
  const ctx = await requireTenant();
  if (ctx instanceof NextResponse) return ctx;

  const { botId } = await params;

  const bot = await prisma.bot.findFirst({
    where: { id: botId, tenantId: ctx.tenantId },
    select: { id: true },
  });
  if (!bot) return NextResponse.json({ error: 'Bot not found' }, { status: 404 });

  const body = (await request.json().catch(() => null)) as {
    entries?: unknown;
    mode?: unknown;
  } | null;

  const mode = body?.mode === 'replace' ? 'replace' : 'append';

  if (!Array.isArray(body?.entries)) {
    return NextResponse.json({ error: 'entries must be an array' }, { status: 400 });
  }
  if (body.entries.length > MAX_ENTRIES) {
    return NextResponse.json(
      { error: `Too many entries — the limit is ${MAX_ENTRIES}` },
      { status: 400 }
    );
  }

  const incoming = body.entries as IncomingEntry[];

  const cleaned = incoming
    .filter(e => e && typeof e.key === 'string' && typeof e.value === 'string')
    .map(e => ({
      key: (e.key as string).trim().slice(0, MAX_KEY_LENGTH),
      value: (e.value as string).trim().slice(0, MAX_VALUE_LENGTH),
      category: typeof e.category === 'string' && e.category.trim()
        ? e.category.trim()
        : 'general',
      project: typeof e.project === 'string' ? e.project.trim() : '',
    }))
    .filter(e => e.key !== '' && e.value !== '');

  if (cleaned.length === 0) {
    return NextResponse.json({ error: 'No valid entries to import' }, { status: 400 });
  }

  // Resolve project names to ids. Only projects that already belong to THIS bot
  // are accepted — an unknown name simply becomes a global entry, and no
  // project is ever created or borrowed from another bot/tenant.
  const projects = await prisma.project.findMany({
    where: { botId },
    select: { id: true, name: true },
  });
  const projectIdByName = new Map(projects.map(p => [p.name.toLowerCase(), p.id]));

  const written = await prisma.$transaction(async tx => {
    let baseOrder = 0;

    if (mode === 'replace') {
      await tx.knowledgeEntry.deleteMany({ where: { botId } });
    } else {
      // Append after whatever is already stored so the existing order is kept.
      const last = await tx.knowledgeEntry.findFirst({
        where: { botId },
        orderBy: { order: 'desc' },
        select: { order: true },
      });
      baseOrder = last ? last.order + 1 : 0;
    }

    // `order` follows the payload's row order, so the list reads back exactly
    // as it looked in the exported file.
    const result = await tx.knowledgeEntry.createMany({
      data: cleaned.map((e, index) => ({
        botId,
        key: e.key,
        value: e.value,
        category: e.category,
        projectId: e.project ? projectIdByName.get(e.project.toLowerCase()) ?? null : null,
        order: baseOrder + index,
      })),
    });

    return result.count;
  });

  return NextResponse.json({
    imported: written,
    skipped: incoming.length - cleaned.length,
    mode,
  });
}
