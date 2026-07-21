'use client';

import { useEffect, useState } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { enUS } from 'date-fns/locale';
import {
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  Loader2,
  RefreshCw,
} from 'lucide-react';

interface AuditLogEntry {
  id: string;
  createdAt: string;
  actorEmail: string;
  action: string;
  targetType: string | null;
  targetId: string | null;
  metadata: Record<string, unknown> | null;
}

interface AuditResponse {
  logs: AuditLogEntry[];
  total: number;
  page: number;
  totalPages: number;
}

// Known actions get a friendly label and a color group. Unknown actions fall
// back to a neutral badge showing the raw string.
const ACTION_CONFIG: Record<string, { label: string; className: string }> = {
  'user.create':         { label: 'User created',       className: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  'user.update':         { label: 'User updated',       className: 'bg-cyan-50 text-cyan-700 border-cyan-200' },
  'user.suspend':        { label: 'User suspended',     className: 'bg-amber-50 text-amber-700 border-amber-200' },
  'user.reactivate':     { label: 'User reactivated',   className: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  'user.delete':         { label: 'User deleted',       className: 'bg-red-50 text-red-700 border-red-200' },
  'user.reset_password': { label: 'Password reset',     className: 'bg-purple-50 text-purple-700 border-purple-200' },
  'openai.set':          { label: 'OpenAI key set',     className: 'bg-cyan-50 text-cyan-700 border-cyan-200' },
  'openai.delete':       { label: 'OpenAI key removed', className: 'bg-red-50 text-red-700 border-red-200' },
  'plan.update':         { label: 'Plan updated',       className: 'bg-blue-50 text-blue-700 border-blue-200' },
  'account.disconnect':  { label: 'Page disconnected',  className: 'bg-amber-50 text-amber-700 border-amber-200' },
  'bot.toggle':          { label: 'Bot toggled',        className: 'bg-slate-100 text-slate-600 border-slate-200' },
};

function summarizeMetadata(metadata: Record<string, unknown> | null): string {
  if (!metadata || typeof metadata !== 'object') return '';
  const parts: string[] = [];
  for (const [key, value] of Object.entries(metadata)) {
    if (value === null || value === undefined) continue;
    let display: string;
    if (typeof value === 'object') {
      display = Array.isArray(value) ? `[${value.length}]` : '{…}';
    } else {
      display = String(value);
    }
    if (display.length > 40) display = `${display.slice(0, 40)}…`;
    parts.push(`${key}: ${display}`);
  }
  return parts.join(' · ');
}

export function AuditLogPanel() {
  const [data, setData] = useState<AuditResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    // Ignore out-of-order responses when paging quickly.
    let active = true;
    setError(null);
    setLoading(true);
    fetch(`/api/admin/audit?page=${page}`, { cache: 'no-store' })
      .then(async (res) => {
        if (!res.ok) throw new Error();
        const json = (await res.json()) as AuditResponse;
        if (active) setData(json);
      })
      .catch(() => {
        if (active) setError('Failed to load the audit log. Please try again.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [page, reloadKey]);

  const totalPages = data?.totalPages ?? 0;
  const logs = data?.logs ?? [];

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
      {/* Header */}
      <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-slate-100 flex items-center justify-center flex-shrink-0">
            <ClipboardList className="h-5 w-5 text-slate-500" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-slate-900">Audit log</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Every privileged admin action, most recent first.
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => setReloadKey((k) => k + 1)}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          Refresh
        </button>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20">
          <Loader2 className="h-6 w-6 text-slate-400 animate-spin mb-3" />
          <p className="text-sm text-slate-500">Loading audit log…</p>
        </div>
      ) : error ? (
        <div className="flex flex-col items-center justify-center py-20">
          <p className="text-sm font-semibold text-slate-900 mb-1">Something went wrong</p>
          <p className="text-xs text-slate-500 mb-4">{error}</p>
          <button
            type="button"
            onClick={() => setReloadKey((k) => k + 1)}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-slate-600 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Retry
          </button>
        </div>
      ) : logs.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20">
          <div className="h-14 w-14 bg-slate-100 rounded-2xl flex items-center justify-center mb-4">
            <ClipboardList className="h-7 w-7 text-slate-400" />
          </div>
          <p className="text-sm font-semibold text-slate-900 mb-1">No audit entries yet</p>
          <p className="text-xs text-slate-500">Admin actions will appear here as they happen.</p>
        </div>
      ) : (
        <>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50">
                  <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide whitespace-nowrap">When</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Actor</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Action</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Target</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Details</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log) => {
                  const cfg = ACTION_CONFIG[log.action];
                  const metaSummary = summarizeMetadata(log.metadata);
                  return (
                    <tr
                      key={log.id}
                      className="border-b border-slate-100 last:border-0 hover:bg-slate-50/80 transition-colors align-top"
                    >
                      <td className="px-5 py-3.5 text-xs text-slate-500 whitespace-nowrap">
                        {formatDistanceToNow(new Date(log.createdAt), { addSuffix: true, locale: enUS })}
                      </td>
                      <td className="px-5 py-3.5 text-sm text-slate-700 truncate max-w-[200px]">
                        {log.actorEmail}
                      </td>
                      <td className="px-5 py-3.5">
                        <span
                          className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border ${
                            cfg ? cfg.className : 'bg-slate-100 text-slate-600 border-slate-200'
                          }`}
                        >
                          {cfg ? cfg.label : log.action}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-xs text-slate-500">
                        {log.targetType ? (
                          <div>
                            <span className="text-slate-600">{log.targetType}</span>
                            {log.targetId && (
                              <span className="block text-slate-400 font-mono text-[11px] truncate max-w-[160px]">
                                {log.targetId}
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="text-slate-300">—</span>
                        )}
                      </td>
                      <td className="px-5 py-3.5 text-xs text-slate-500 max-w-[280px]">
                        {metaSummary || <span className="text-slate-300">—</span>}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="px-6 py-4 border-t border-slate-100 flex items-center justify-between gap-4">
            <p className="text-xs text-slate-500">
              {data ? `${data.total.toLocaleString('en-US')} entr${data.total === 1 ? 'y' : 'ies'}` : ''}
              {totalPages > 1 && ` · Page ${data?.page ?? page} of ${totalPages}`}
            </p>
            {totalPages > 1 && (
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page <= 1}
                  className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <ChevronLeft className="h-3.5 w-3.5" />
                  Previous
                </button>
                <button
                  type="button"
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page >= totalPages}
                  className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Next
                  <ChevronRight className="h-3.5 w-3.5" />
                </button>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
