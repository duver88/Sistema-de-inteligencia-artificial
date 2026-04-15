import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { PageHeader } from '@/components/layout/PageHeader';
import { MessageSquare, Settings, TrendingUp, Zap } from 'lucide-react';
import Link from 'next/link';

export default async function OverviewPage() {
  const session = await auth();
  const tenantId = session?.user?.tenantId;

  if (!tenantId) return null;

  // Fetch summary stats
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const [
    totalBots,
    activeBots,
    commentsToday,
    repliesToday,
    deletedToday,
    totalComments,
  ] = await Promise.all([
    prisma.bot.count({ where: { tenantId } }),
    prisma.bot.count({ where: { tenantId, isActive: true } }),
    prisma.commentLog.count({ where: { tenantId, createdAt: { gte: today } } }),
    prisma.commentLog.count({
      where: { tenantId, action: 'REPLIED', createdAt: { gte: today } },
    }),
    prisma.commentLog.count({
      where: { tenantId, action: 'DELETED', createdAt: { gte: today } },
    }),
    prisma.commentLog.count({ where: { tenantId } }),
  ]);

  const stats = [
    {
      label: 'Active Bots',
      value: `${activeBots} / ${totalBots}`,
      icon: Settings,
      color: 'text-indigo-600',
      bg: 'bg-indigo-50',
    },
    {
      label: 'Comments Today',
      value: commentsToday.toString(),
      icon: MessageSquare,
      color: 'text-slate-600',
      bg: 'bg-slate-100',
    },
    {
      label: 'Replied Today',
      value: repliesToday.toString(),
      icon: Zap,
      color: 'text-emerald-600',
      bg: 'bg-emerald-50',
    },
    {
      label: 'Deleted Today',
      value: deletedToday.toString(),
      icon: TrendingUp,
      color: 'text-red-600',
      bg: 'bg-red-50',
    },
  ];

  return (
    <div>
      <PageHeader
        title={`Welcome back, ${session?.user?.name?.split(' ')[0] ?? 'there'}`}
        description="Here's what's happening with your comment bots today."
      />

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {stats.map(stat => (
          <div
            key={stat.label}
            className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm"
          >
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm text-slate-500">{stat.label}</span>
              <div className={`h-8 w-8 rounded-lg ${stat.bg} flex items-center justify-center`}>
                <stat.icon className={`h-4 w-4 ${stat.color}`} />
              </div>
            </div>
            <p className="text-2xl font-semibold text-slate-900">{stat.value}</p>
          </div>
        ))}
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Link
          href="/accounts"
          className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm hover:shadow-md transition-shadow flex items-center gap-4"
        >
          <div className="h-10 w-10 rounded-xl bg-indigo-50 flex items-center justify-center">
            <Settings className="h-5 w-5 text-indigo-600" />
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-900">Connect Account</p>
            <p className="text-xs text-slate-500">Add Facebook or Instagram pages</p>
          </div>
        </Link>

        <Link
          href="/bots"
          className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm hover:shadow-md transition-shadow flex items-center gap-4"
        >
          <div className="h-10 w-10 rounded-xl bg-emerald-50 flex items-center justify-center">
            <Zap className="h-5 w-5 text-emerald-600" />
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-900">Configure Bots</p>
            <p className="text-xs text-slate-500">Set up AI responses and rules</p>
          </div>
        </Link>

        <Link
          href="/comments"
          className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm hover:shadow-md transition-shadow flex items-center gap-4"
        >
          <div className="h-10 w-10 rounded-xl bg-slate-100 flex items-center justify-center">
            <MessageSquare className="h-5 w-5 text-slate-600" />
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-900">View Comments</p>
            <p className="text-xs text-slate-500">{totalComments.toLocaleString()} total processed</p>
          </div>
        </Link>
      </div>
    </div>
  );
}
