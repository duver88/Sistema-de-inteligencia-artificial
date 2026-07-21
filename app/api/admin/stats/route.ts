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
    prisma.user.count({
      where: { isSuperAdmin: false, accessExpiresAt: { lte: now } },
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
