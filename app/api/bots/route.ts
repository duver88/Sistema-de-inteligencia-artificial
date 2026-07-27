import { NextResponse } from 'next/server';
import { requireTenant } from '@/lib/tenant';
import { prisma } from '@/lib/prisma';

// GET — List all bots with stats
export async function GET() {
  const ctx = await requireTenant();
  if (ctx instanceof NextResponse) return ctx;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const bots = await prisma.bot.findMany({
    // Only bots of still-connected accounts (a disconnected page's bot is kept
    // in the DB for reconnection but must not be listed).
    where: { tenantId: ctx.tenantId, account: { isActive: true } },
    include: {
      account: {
        select: { platform: true, pageName: true, pictureUrl: true },
      },
      _count: {
        select: {
          comments: { where: { createdAt: { gte: today } } },
        },
      },
    },
    orderBy: { createdAt: 'asc' },
  });

  // Fetch reply/delete counts per bot for today
  const botStats = await Promise.all(
    bots.map(async (bot) => {
      const [repliesToday, deletedToday] = await Promise.all([
        // Count by repliedAt / deletedAt rather than by `action`, which only
        // holds the comment's LAST state (see app/(dashboard)/overview/page.tsx).
        prisma.commentLog.count({
          where: { botId: bot.id, repliedAt: { gte: today } },
        }),
        prisma.commentLog.count({
          where: { botId: bot.id, deletedAt: { gte: today } },
        }),
      ]);
      return {
        ...bot,
        stats: {
          commentsToday: bot._count.comments,
          repliesToday,
          deletedToday,
        },
      };
    })
  );

  return NextResponse.json({ bots: botStats });
}
