'use client';

import { useCallback, useEffect, useState } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { enUS } from 'date-fns/locale';
import {
  AlertTriangle, CheckCircle2, Loader2, RefreshCw,
  Users, Link2, Bot, MessageSquare,
} from 'lucide-react';
import { ActivityChart, type DayPoint } from './ActivityChart';

interface AdminStats {
  users: {
    total: number;
    active: number;
    suspended: number;
    expired: number;
    admins: number;
  };
  accounts: {
    total: number;
    webhookSubscribed: number;
  };
  bots: {
    total: number;
    active: number;
  };
  comments: {
    total: number;
    today: number;
    last7d: number;
    byAction: Record<string, number>;
    byDay: DayPoint[];
  };
  recentErrors: {
    id: string;
    createdAt: string;
    pageName: string | null;
    authorName: string | null;
    error: string | null;
  }[];
}

const ACTION_COLORS: Record<string, string> = {
  REPLIED: 'bg-emerald-500',
  DELETED: 'bg-red-500',
  HIDDEN: 'bg-amber-500',
  IGNORED: 'bg-slate-400',
  ERROR: 'bg-rose-500',
};

function formatNumber(value: number): string {
  return value.toLocaleString('en-US');
}

function truncateError(message: string, max = 160): string {
  return message.length > max ? `${message.slice(0, max).trimEnd()}…` : message;
}

function StatTile({ label, value, sub }: { label: string; value: number; sub?: string }) {
  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
      <p className="text-xs text-slate-500 font-medium uppercase tracking-wide mb-2">{label}</p>
      <p className="text-3xl font-bold text-slate-900">{formatNumber(value)}</p>
      {sub && <p className="text-xs text-slate-400 mt-1">{sub}</p>}
    </div>
  );
}

function KpiCard({
  label, value, sub, icon: Icon, from, to, ink,
}: {
  label: string; value: number; sub: string;
  icon: typeof Users; from: string; to: string; ink: string;
}) {
  return (
    <div className="rounded-2xl shadow-lg p-5" style={{ background: `linear-gradient(135deg, ${from} 0%, ${to} 100%)` }}>
      <div className="flex items-center justify-between mb-4">
        <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: ink, opacity: 0.75 }}>{label}</p>
        <div className="h-8 w-8 rounded-lg bg-white/25 flex items-center justify-center">
          <Icon className="h-4 w-4" style={{ color: ink }} />
        </div>
      </div>
      <p className="text-4xl font-bold" style={{ color: ink }}>{formatNumber(value)}</p>
      <p className="text-xs mt-1" style={{ color: ink, opacity: 0.7 }}>{sub}</p>
    </div>
  );
}

export function AdminOverview() {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchStats = useCallback(async () => {
    setError(null);
    try {
      const res = await fetch('/api/admin/stats', { cache: 'no-store' });
      if (!res.ok) throw new Error();
      const data = (await res.json()) as AdminStats;
      setStats(data);
    } catch {
      setError('Failed to load platform stats. Please try again.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void fetchStats();
  }, [fetchStats]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 bg-white border border-slate-200 rounded-2xl shadow-sm">
        <Loader2 className="h-6 w-6 text-slate-400 animate-spin mb-3" />
        <p className="text-sm text-slate-500">Loading platform stats…</p>
      </div>
    );
  }

  if (error || !stats) {
    return (
      <div className="flex flex-col items-center justify-center py-24 bg-white border border-slate-200 rounded-2xl shadow-sm">
        <p className="text-sm font-semibold text-slate-900 mb-1">Something went wrong</p>
        <p className="text-xs text-slate-500 mb-4">{error ?? 'No stats available.'}</p>
        <button
          type="button"
          onClick={() => { setLoading(true); void fetchStats(); }}
          className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-slate-600 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          Retry
        </button>
      </div>
    );
  }

  const actionEntries = Object.entries(stats.comments.byAction)
    .sort(([, a], [, b]) => b - a);
  const maxActionCount = Math.max(1, ...actionEntries.map(([, count]) => count));

  return (
    <div>
      <div className="flex items-center justify-end mb-4">
        <button
          type="button"
          onClick={() => { setRefreshing(true); void fetchStats(); }}
          disabled={refreshing}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* Hero KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
        <KpiCard
          label="Users" value={stats.users.total}
          sub={`${formatNumber(stats.users.active)} active · ${formatNumber(stats.users.admins)} admins`}
          icon={Users} from="#6366f1" to="#4f46e5" ink="#ffffff"
        />
        <KpiCard
          label="Connected pages" value={stats.accounts.total}
          sub={`${formatNumber(stats.accounts.webhookSubscribed)} with webhook`}
          icon={Link2} from="#00C4D4" to="#00E5FF" ink="#0a1628"
        />
        <KpiCard
          label="Active bots" value={stats.bots.active}
          sub={`of ${formatNumber(stats.bots.total)} total`}
          icon={Bot} from="#10b981" to="#059669" ink="#ffffff"
        />
        <KpiCard
          label="Comments today" value={stats.comments.today}
          sub={`${formatNumber(stats.comments.last7d)} in the last 7 days`}
          icon={MessageSquare} from="#3b82f6" to="#2563eb" ink="#ffffff"
        />
      </div>

      {/* Activity chart + user status breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-4">
        <div className="lg:col-span-2">
          <ActivityChart data={stats.comments.byDay} />
        </div>
        <div className="grid grid-cols-2 gap-4 content-start">
          <StatTile label="Suspended" value={stats.users.suspended} />
          <StatTile label="Expired" value={stats.users.expired} />
          <StatTile label="Bots total" value={stats.bots.total} />
          <StatTile label="Total comments" value={stats.comments.total} />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Comments by action */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
          <p className="text-xs text-slate-500 font-medium uppercase tracking-wide mb-4">
            Comments by action
          </p>
          {actionEntries.length === 0 ? (
            <p className="text-xs text-slate-400 py-6 text-center">No comments processed yet.</p>
          ) : (
            <div className="space-y-3">
              {actionEntries.map(([action, count]) => (
                <div key={action} className="flex items-center gap-3">
                  <span className="w-20 text-xs font-medium text-slate-600 flex-shrink-0">
                    {action}
                  </span>
                  <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full ${ACTION_COLORS[action] ?? 'bg-cyan-500'}`}
                      style={{ width: `${Math.max(2, (count / maxActionCount) * 100)}%` }}
                    />
                  </div>
                  <span className="w-16 text-right text-xs font-semibold text-slate-700 flex-shrink-0">
                    {formatNumber(count)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent errors */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
          <p className="text-xs text-slate-500 font-medium uppercase tracking-wide mb-4">
            Recent errors
          </p>
          {stats.recentErrors.length === 0 ? (
            <div className="flex flex-col items-center py-6">
              <CheckCircle2 className="h-5 w-5 text-emerald-500 mb-2" />
              <p className="text-xs text-slate-400">No recent errors.</p>
            </div>
          ) : (
            <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
              {stats.recentErrors.map((item) => (
                <div
                  key={item.id}
                  className="flex items-start gap-2.5 p-3 bg-red-50/60 border border-red-100 rounded-xl"
                >
                  <AlertTriangle className="h-4 w-4 text-red-500 flex-shrink-0 mt-0.5" />
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-semibold text-slate-800 truncate">
                        {item.pageName ?? 'Unknown page'}
                      </span>
                      {item.authorName && (
                        <span className="text-[11px] text-slate-500 truncate">
                          by {item.authorName}
                        </span>
                      )}
                      <span className="text-[11px] text-slate-400 whitespace-nowrap">
                        {formatDistanceToNow(new Date(item.createdAt), { addSuffix: true, locale: enUS })}
                      </span>
                    </div>
                    <p className="text-xs text-red-700 mt-1 break-words">
                      {item.error ? truncateError(item.error) : 'Unknown error'}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
