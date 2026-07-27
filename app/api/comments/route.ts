import { NextRequest, NextResponse } from 'next/server';
import { requireTenant } from '@/lib/tenant';
import { prisma } from '@/lib/prisma';
import type { Prisma } from '@/lib/generated/prisma/client';

const VALID_ACTIONS = ['REPLIED', 'DELETED', 'HIDDEN', 'IGNORED', 'MANUAL_REPLY', 'MANUAL_DELETE', 'REPLY_DELETED', 'ERROR'] as const;
type CommentActionValue = (typeof VALID_ACTIONS)[number];

export async function GET(request: NextRequest) {
  const ctx = await requireTenant();
  if (ctx instanceof NextResponse) return ctx;

  const { searchParams } = new URL(request.url);
  const botId = searchParams.get('botId') ?? undefined;
  const action = searchParams.get('action') ?? undefined;
  const actions = action
    ? action
        .split(',')
        .map(s => s.trim())
        .filter((s): s is CommentActionValue => (VALID_ACTIONS as readonly string[]).includes(s))
    : undefined;
  const rawPlatform = searchParams.get('platform') ?? undefined;
  const platform = rawPlatform === 'FACEBOOK' || rawPlatform === 'INSTAGRAM' ? rawPlatform : undefined;
  const search = searchParams.get('search') ?? undefined;
  const parsedPage = parseInt(searchParams.get('page') ?? '1', 10);
  const page = Number.isFinite(parsedPage) ? Math.max(1, parsedPage) : 1;
  const limit = 50;

  const where: Prisma.CommentLogWhereInput = {
    tenantId: ctx.tenantId,
    ...(botId ? { botId } : {}),
    // Same rule as the server-rendered /comments page: with no explicit action
    // filter, hand-deleted comments are hidden from the list. The rows stay in
    // the database and come back when the caller asks for MANUAL_DELETE.
    ...(actions?.length
      ? { action: { in: actions } }
      : { action: { not: 'MANUAL_DELETE' as const } }),
    ...(platform ? { platform: { equals: platform } } : {}),
    ...(search
      ? {
          OR: [
            { originalText: { contains: search, mode: 'insensitive' as const } },
            { authorName: { contains: search, mode: 'insensitive' as const } },
          ],
        }
      : {}),
  };

  const [total, comments] = await Promise.all([
    prisma.commentLog.count({ where }),
    prisma.commentLog.findMany({
      where,
      include: {
        bot: {
          select: {
            name: true,
            account: { select: { pageName: true, pictureUrl: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
  ]);

  return NextResponse.json({
    comments,
    total,
    page,
    totalPages: Math.ceil(total / limit),
  });
}
