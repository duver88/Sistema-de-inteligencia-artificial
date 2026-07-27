import { NextRequest, NextResponse } from 'next/server';
import { requireTenant } from '@/lib/tenant';
import { prisma } from '@/lib/prisma';
import { toCsv, type KnowledgeRow } from '@/lib/knowledge/csv';

type Params = { params: Promise<{ botId: string }> };

// GET — Download the bot's knowledge base as CSV.
// The file can be edited in Excel and imported back: the import route
// recognises this exact header and restores it verbatim, without the AI pass.
export async function GET(_req: NextRequest, { params }: Params) {
  const ctx = await requireTenant();
  if (ctx instanceof NextResponse) return ctx;

  const { botId } = await params;

  const bot = await prisma.bot.findFirst({
    where: { id: botId, tenantId: ctx.tenantId },
    select: { id: true, name: true },
  });
  if (!bot) return NextResponse.json({ error: 'Bot not found' }, { status: 404 });

  const entries = await prisma.knowledgeEntry.findMany({
    where: { botId },
    include: { project: { select: { name: true } } },
    // Same order the editor shows, with createdAt/id as tie-breakers so two
    // exports of an unchanged knowledge base are byte-identical.
    orderBy: [
      { projectId: 'asc' },
      { order: 'asc' },
      { createdAt: 'asc' },
      { id: 'asc' },
    ],
  });

  const rows: KnowledgeRow[] = entries.map(e => ({
    key: e.key,
    value: e.value,
    category: e.category ?? 'general',
    project: e.project?.name ?? '',
  }));

  const slug =
    bot.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'bot';
  const date = new Date().toISOString().slice(0, 10);

  return new NextResponse(toCsv(rows), {
    status: 200,
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="knowledge-${slug}-${date}.csv"`,
      'Cache-Control': 'no-store',
    },
  });
}
