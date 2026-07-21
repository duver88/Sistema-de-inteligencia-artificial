import { NextResponse } from 'next/server';
import { requireSuperAdmin } from '@/lib/tenant';
import { prisma } from '@/lib/prisma';

// GET /api/admin/stats — platform-wide health overview (super admin only)
export async function GET() {
  const ctx = await requireSuperAdmin();
  if (ctx instanceof NextResponse) return ctx;

  const now = new Date();
  const todayStart = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())
  );
  const last7dStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  const [
    usersTotal,
    usersActive,
    usersSuspended,
    usersExpired,
    usersAdmins,
    accountsTotal,
    accountsWebhookSubscribed,
    botsTotal,
    botsActive,
    commentsTotal,
    commentsToday,
    commentsLast7d,
    commentsByAction,
    recentErrorLogs,
  ] = await Promise.all([
    prisma.user.count(),
    // Active = ACTIVE status and not past their access expiration
    // (expiration is ignored entirely for superadmins — see schema)
    prisma.user.count({
      where: {
        status: 'ACTIVE',
        OR: [
          { isSuperAdmin: true },
          { accessExpiresAt: null },
          { accessExpiresAt: { gt: now } },
        ],
      },
    }),
    prisma.user.count({ where: { status: 'SUSPENDED' } }),
    // Expired = non-superadmin, past expiration, and NOT already suspended
    // (status priority is Suspended > Expired > Active, so a suspended user
    // must not also be counted here).
    prisma.user.count({
      where: { isSuperAdmin: false, status: { not: 'SUSPENDED' }, accessExpiresAt: { lte: now } },
    }),
    prisma.user.count({ where: { isSuperAdmin: true } }),
    prisma.socialAccount.count(),
    prisma.socialAccount.count({ where: { webhookSubscribed: true } }),
    prisma.bot.count(),
    prisma.bot.count({ where: { isActive: true } }),
    prisma.commentLog.count(),
    prisma.commentLog.count({ where: { createdAt: { gte: todayStart } } }),
    prisma.commentLog.count({ where: { createdAt: { gte: last7dStart } } }),
    prisma.commentLog.groupBy({ by: ['action'], _count: { _all: true } }),
    prisma.commentLog.findMany({
      where: { action: 'ERROR' },
      orderBy: { createdAt: 'desc' },
      take: 10,
      select: {
        id: true,
        createdAt: true,
        authorName: true,
        errorMessage: true,
        bot: { select: { account: { select: { pageName: true } } } },
      },
    }),
  ]);

  const byAction: Record<string, number> = {};
  for (const group of commentsByAction) {
    byAction[group.action] = group._count._all;
  }

  // Daily comment volume for the last 14 days (UTC), split into replied vs
  // total, so the dashboard can plot an activity trend. Gaps are backfilled
  // with zeros below.
  const DAYS = 14;
  const rangeStart = new Date(todayStart.getTime() - (DAYS - 1) * 24 * 60 * 60 * 1000);
  const dailyRows = await prisma.$queryRaw<{ day: Date; total: bigint; replied: bigint }[]>`
    SELECT date_trunc('day', "createdAt" AT TIME ZONE 'UTC') AS day,
           count(*) AS total,
           count(*) FILTER (WHERE "action" IN ('REPLIED', 'MANUAL_REPLY')) AS replied
    FROM "CommentLog"
    WHERE "createdAt" >= ${rangeStart}
    GROUP BY 1
    ORDER BY 1
  `;
  const dailyMap = new Map<string, { total: number; replied: number }>();
  for (const row of dailyRows) {
    const key = row.day.toISOString().slice(0, 10);
    dailyMap.set(key, { total: Number(row.total), replied: Number(row.replied) });
  }
  const byDay = Array.from({ length: DAYS }, (_, i) => {
    const d = new Date(rangeStart.getTime() + i * 24 * 60 * 60 * 1000);
    const key = d.toISOString().slice(0, 10);
    const entry = dailyMap.get(key);
    return { day: key, total: entry?.total ?? 0, replied: entry?.replied ?? 0 };
  });

  return NextResponse.json({
    users: {
      total: usersTotal,
      active: usersActive,
      suspended: usersSuspended,
      expired: usersExpired,
      admins: usersAdmins,
    },
    accounts: {
      total: accountsTotal,
      webhookSubscribed: accountsWebhookSubscribed,
    },
    bots: {
      total: botsTotal,
      active: botsActive,
    },
    comments: {
      total: commentsTotal,
      today: commentsToday,
      last7d: commentsLast7d,
      byAction,
      byDay,
    },
    recentErrors: recentErrorLogs.map((log) => ({
      id: log.id,
      createdAt: log.createdAt,
      pageName: log.bot.account.pageName,
      authorName: log.authorName,
      error: log.errorMessage,
    })),
  });
}
