'use client';

import { useCallback, useEffect, useState } from 'react';
import { BarChart3, Loader2, RefreshCw } from 'lucide-react';

interface UsageData {
  totals: {
    calls: number;
    promptTokens: number;
    completionTokens: number;
  };
  byTenant: {
    tenantId: string;
    tenantName: string;
    calls: number;
    promptTokens: number;
    completionTokens: number;
  }[];
  byDay: {
    day: string;
    calls: number;
    totalTokens: number;
  }[];
}

const DAY_OPTIONS = [7, 30, 90] as const;

function formatNumber(value: number): string {
  return value.toLocaleString('en-US');
}

function formatDay(day: string): string {
  return new Date(day).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    timeZone: 'UTC',
  });
}

export function UsagePanel() {
  const [days, setDays] = useState<number>(30);
  const [data, setData] = useState<UsageData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchUsage = useCallback(async (rangeDays: number) => {
    setError(null);
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/usage?days=${rangeDays}`, { cache: 'no-store' });
      if (!res.ok) throw new Error();
      const usage = (await res.json()) as UsageData;
      setData(usage);
    } catch {
      setError('Failed to load AI usage. Please try again.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // Ignore a slow response for a range the user already switched away from,
    // so out-of-order responses can't show data for the wrong range.
    let active = true;
    setError(null);
    setLoading(true);
    fetch(`/api/admin/usage?days=${days}`, { cache: 'no-store' })
      .then(async (res) => {
        if (!res.ok) throw new Error();
        const usage = (await res.json()) as UsageData;
        if (active) setData(usage);
      })
      .catch(() => {
        if (active) setError('Failed to load AI usage. Please try again.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [days]);

  const totalTokens = data
    ? data.totals.promptTokens + data.totals.completionTokens
    : 0;
  const maxDayTokens = data ? Math.max(1, ...data.byDay.map((d) => d.totalTokens)) : 1;

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
      {/* Header */}
      <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-slate-100 flex items-center justify-center flex-shrink-0">
            <BarChart3 className="h-5 w-5 text-slate-500" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-slate-900">AI Usage</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              OpenAI calls and tokens consumed across all tenants.
            </p>
          </div>
        </div>
        <div className="inline-flex items-center gap-0.5 p-0.5 bg-slate-100 rounded-lg">
          {DAY_OPTIONS.map((option) => (
            <button
              key={option}
              type="button"
              onClick={() => setDays(option)}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${
                days === option
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              {option}d
            </button>
          ))}
        </div>
      </div>

      <div className="p-6">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-16">
            <Loader2 className="h-6 w-6 text-slate-400 animate-spin mb-3" />
            <p className="text-sm text-slate-500">Loading usage…</p>
          </div>
        ) : error || !data ? (
          <div className="flex flex-col items-center justify-center py-16">
            <p className="text-sm font-semibold text-slate-900 mb-1">Something went wrong</p>
            <p className="text-xs text-slate-500 mb-4">{error ?? 'No usage data available.'}</p>
            <button
              type="button"
              onClick={() => void fetchUsage(days)}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-slate-600 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              Retry
            </button>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Totals */}
            <div className="grid grid-cols-4 gap-4">
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
                <p className="text-[11px] text-slate-500 font-medium uppercase tracking-wide mb-1.5">
                  API calls
                </p>
                <p className="text-2xl font-bold text-slate-900">{formatNumber(data.totals.calls)}</p>
              </div>
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
                <p className="text-[11px] text-slate-500 font-medium uppercase tracking-wide mb-1.5">
                  Prompt tokens
                </p>
                <p className="text-2xl font-bold text-slate-900">
                  {formatNumber(data.totals.promptTokens)}
                </p>
              </div>
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
                <p className="text-[11px] text-slate-500 font-medium uppercase tracking-wide mb-1.5">
                  Completion tokens
                </p>
                <p className="text-2xl font-bold text-slate-900">
                  {formatNumber(data.totals.completionTokens)}
                </p>
              </div>
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
                <p className="text-[11px] text-slate-500 font-medium uppercase tracking-wide mb-1.5">
                  Total tokens
                </p>
                <p className="text-2xl font-bold text-slate-900">{formatNumber(totalTokens)}</p>
              </div>
            </div>

            {data.totals.calls === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 border border-dashed border-slate-200 rounded-xl">
                <BarChart3 className="h-6 w-6 text-slate-300 mb-2" />
                <p className="text-sm font-semibold text-slate-700 mb-0.5">No AI usage yet</p>
                <p className="text-xs text-slate-400">
                  No OpenAI calls were recorded in the last {days} days.
                </p>
              </div>
            ) : (
              <>
                {/* Daily tokens */}
                {data.byDay.length > 0 && (
                  <div>
                    <p className="text-[11px] text-slate-500 font-medium uppercase tracking-wide mb-3">
                      Tokens per day
                    </p>
                    <div className="flex items-end gap-[3px] h-24">
                      {data.byDay.map((d) => (
                        <div
                          key={d.day}
                          className="flex-1 bg-cyan-400/80 hover:bg-cyan-500 rounded-t-sm transition-colors min-w-[2px]"
                          style={{ height: `${Math.max(3, (d.totalTokens / maxDayTokens) * 100)}%` }}
                          title={`${formatDay(d.day)} — ${formatNumber(d.totalTokens)} tokens, ${formatNumber(d.calls)} calls`}
                        />
                      ))}
                    </div>
                    <div className="flex justify-between mt-1.5 text-[10px] text-slate-400">
                      <span>{formatDay(data.byDay[0].day)}</span>
                      <span>{formatDay(data.byDay[data.byDay.length - 1].day)}</span>
                    </div>
                  </div>
                )}

                {/* By tenant */}
                <div>
                  <p className="text-[11px] text-slate-500 font-medium uppercase tracking-wide mb-3">
                    Usage by user
                  </p>
                  {data.byTenant.length === 0 ? (
                    <p className="text-xs text-slate-400 py-4 text-center">
                      No per-tenant usage in this period.
                    </p>
                  ) : (
                    <div className="border border-slate-200 rounded-xl overflow-hidden">
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="border-b border-slate-200 bg-slate-50">
                              <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Tenant</th>
                              <th className="text-right px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Calls</th>
                              <th className="text-right px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Prompt tokens</th>
                              <th className="text-right px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Completion tokens</th>
                              <th className="text-right px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Total tokens</th>
                            </tr>
                          </thead>
                          <tbody>
                            {data.byTenant.map((tenant) => (
                              <tr
                                key={tenant.tenantId}
                                className="border-b border-slate-100 last:border-0 hover:bg-slate-50/80 transition-colors"
                              >
                                <td className="px-5 py-3 text-sm font-medium text-slate-800 truncate max-w-[220px]">
                                  {tenant.tenantName}
                                </td>
                                <td className="px-5 py-3 text-right text-slate-600">
                                  {formatNumber(tenant.calls)}
                                </td>
                                <td className="px-5 py-3 text-right text-slate-600">
                                  {formatNumber(tenant.promptTokens)}
                                </td>
                                <td className="px-5 py-3 text-right text-slate-600">
                                  {formatNumber(tenant.completionTokens)}
                                </td>
                                <td className="px-5 py-3 text-right font-semibold text-slate-800">
                                  {formatNumber(tenant.promptTokens + tenant.completionTokens)}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
