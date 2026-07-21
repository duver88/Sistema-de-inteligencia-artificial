'use client';

import { useCallback, useEffect, useState } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { enUS } from 'date-fns/locale';
import { AlertTriangle, CheckCircle2, Loader2, RefreshCw } from 'lucide-react';

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

      {/* Users */}
      <div className="grid grid-cols-5 gap-4 mb-4">
        <StatTile label="Users" value={stats.users.total} />
        <StatTile label="Active" value={stats.users.active} />
        <StatTile label="Suspended" value={stats.users.suspended} />
        <StatTile label="Expired" value={stats.users.expired} />
        <StatTile label="Admins" value={stats.users.admins} />
      </div>

      {/* Platform */}
      <div className="grid grid-cols-5 gap-4 mb-6">
        <StatTile
          label="Connected pages"
          value={stats.accounts.total}
          sub={`${formatNumber(stats.accounts.webhookSubscribed)} with webhook`}
        />
        <StatTile
          label="Bots"
          value={stats.bots.total}
          sub={`${formatNumber(stats.bots.active)} active`}
        />
        <StatTile label="Comments today" value={stats.comments.today} />
        <StatTile label="Last 7 days" value={stats.comments.last7d} />
        <StatTile label="Total comments" value={stats.comments.total} />
      </div>

      <div className="grid grid-cols-2 gap-4">
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
