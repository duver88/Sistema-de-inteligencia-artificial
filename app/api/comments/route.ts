import { NextRequest, NextResponse } from 'next/server';
import { requireTenant } from '@/lib/tenant';
import { prisma } from '@/lib/prisma';
import type { Prisma } from '@/lib/generated/prisma/client';

const VALID_ACTIONS = ['REPLIED', 'DELETED', 'HIDDEN', 'IGNORED', 'MANUAL_REPLY', 'MANUAL_DELETE', 'ERROR'] as const;
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
  const platform = searchParams.get('platform') ?? undefined;
  const search = searchParams.get('search') ?? undefined;
  const page = Math.max(1, parseInt(searchParams.get('page') ?? '1', 10));
  const limit = 50;

  const where: Prisma.CommentLogWhereInput = {
    tenantId: ctx.tenantId,
    ...(botId ? { botId } : {}),
    ...(actions?.length ? { action: { in: actions } } : {}),
    ...(platform ? { platform: { equals: platform as 'FACEBOOK' | 'INSTAGRAM' } } : {}),
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
