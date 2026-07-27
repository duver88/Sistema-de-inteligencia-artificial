'use client';

import { useEffect, useState } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { enUS } from 'date-fns/locale';
import {
  ChevronLeft,
  ChevronRight,
  Loader2,
  MessageSquare,
  RefreshCw,
} from 'lucide-react';
import { FacebookIcon } from '@/components/icons/FacebookIcon';
import { InstagramIcon } from '@/components/icons/InstagramIcon';

type CommentAction =
  | 'REPLIED'
  | 'DELETED'
  | 'HIDDEN'
  | 'IGNORED'
  | 'MANUAL_REPLY'
  | 'MANUAL_DELETE'
  | 'REPLY_DELETED'
  | 'ERROR';

interface ModerationComment {
  id: string;
  createdAt: string;
  platform: 'FACEBOOK' | 'INSTAGRAM';
  authorName: string;
  originalText: string;
  action: CommentAction;
  aiReply: string | null;
  pageName: string;
  tenantName: string;
}

interface ModerationResponse {
  comments: ModerationComment[];
  total: number;
  page: number;
  totalPages: number;
}

const ACTION_CONFIG: Record<CommentAction, { label: string; className: string }> = {
  REPLIED:       { label: 'Replied',       className: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  DELETED:       { label: 'Deleted',       className: 'bg-red-50 text-red-700 border-red-200' },
  HIDDEN:        { label: 'Hidden',        className: 'bg-amber-50 text-amber-700 border-amber-200' },
  IGNORED:       { label: 'Ignored',       className: 'bg-slate-100 text-slate-600 border-slate-200' },
  MANUAL_REPLY:  { label: 'Manual reply',  className: 'bg-cyan-50 text-cyan-700 border-cyan-200' },
  MANUAL_DELETE: { label: 'Manual delete', className: 'bg-rose-50 text-rose-700 border-rose-200' },
  REPLY_DELETED: { label: 'Reply deleted', className: 'bg-orange-50 text-orange-700 border-orange-200' },
  ERROR:         { label: 'Error',         className: 'bg-red-100 text-red-800 border-red-300' },
};

const ACTION_FILTERS: { value: string; label: string }[] = [
  { value: '', label: 'All actions' },
  { value: 'REPLIED', label: 'Replied' },
  { value: 'DELETED', label: 'Deleted' },
  { value: 'HIDDEN', label: 'Hidden' },
  { value: 'IGNORED', label: 'Ignored' },
  { value: 'MANUAL_REPLY', label: 'Manual reply' },
  { value: 'MANUAL_DELETE', label: 'Manual delete' },
  { value: 'REPLY_DELETED', label: 'Reply deleted' },
  { value: 'ERROR', label: 'Error' },
];

function truncate(text: string, max = 140): string {
  if (text.length <= max) return text;
  return `${text.slice(0, max).trimEnd()}…`;
}

function PlatformBadge({ platform }: { platform: 'FACEBOOK' | 'INSTAGRAM' }) {
  if (platform === 'INSTAGRAM') {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-pink-50 text-pink-700 border border-pink-200">
        <InstagramIcon className="h-3 w-3" />
        Instagram
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-blue-50 text-blue-700 border border-blue-200">
      <FacebookIcon className="h-3 w-3" />
      Facebook
    </span>
  );
}

export function ModerationPanel() {
  const [data, setData] = useState<ModerationResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [action, setAction] = useState('');
  const [page, setPage] = useState(1);
  // Bumped to force a refetch (Retry / Refresh) without changing filter/page.
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    // Ignore out-of-order responses when the filter or page changes quickly,
    // so a slow earlier request can't overwrite the current view.
    let active = true;
    setError(null);
    setLoading(true);
    const params = new URLSearchParams();
    if (action) params.set('action', action);
    params.set('page', String(page));
    fetch(`/api/admin/comments?${params.toString()}`, { cache: 'no-store' })
      .then(async (res) => {
        if (!res.ok) throw new Error();
        const json = (await res.json()) as ModerationResponse;
        if (active) setData(json);
      })
      .catch(() => {
        if (active) setError('Failed to load comments. Please try again.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [action, page, reloadKey]);

  function handleActionChange(value: string) {
    setAction(value);
    setPage(1);
  }

  const totalPages = data?.totalPages ?? 0;
  const comments = data?.comments ?? [];

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
      {/* Header */}
      <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-slate-100 flex items-center justify-center flex-shrink-0">
            <MessageSquare className="h-5 w-5 text-slate-500" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-slate-900">Moderation</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Every comment processed across all tenants.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={action}
            onChange={(e) => handleActionChange(e.target.value)}
            className="text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-cyan-400/40"
          >
            {ACTION_FILTERS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={() => setReloadKey((k) => k + 1)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Refresh
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20">
          <Loader2 className="h-6 w-6 text-slate-400 animate-spin mb-3" />
          <p className="text-sm text-slate-500">Loading comments…</p>
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
      ) : comments.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20">
          <div className="h-14 w-14 bg-slate-100 rounded-2xl flex items-center justify-center mb-4">
            <MessageSquare className="h-7 w-7 text-slate-400" />
          </div>
          <p className="text-sm font-semibold text-slate-900 mb-1">No comments found</p>
          <p className="text-xs text-slate-500">
            {action ? 'No comments match this filter.' : 'No comments have been processed yet.'}
          </p>
        </div>
      ) : (
        <>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50">
                  <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide whitespace-nowrap">When</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Platform</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Tenant / Page</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Author</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Comment</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Action</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">AI reply</th>
                </tr>
              </thead>
              <tbody>
                {comments.map((c) => {
                  const actionCfg = ACTION_CONFIG[c.action] ?? ACTION_CONFIG.IGNORED;
                  return (
                    <tr
                      key={c.id}
                      className="border-b border-slate-100 last:border-0 hover:bg-slate-50/80 transition-colors align-top"
                    >
                      <td className="px-5 py-3.5 text-xs text-slate-500 whitespace-nowrap">
                        {formatDistanceToNow(new Date(c.createdAt), { addSuffix: true, locale: enUS })}
                      </td>
                      <td className="px-5 py-3.5">
                        <PlatformBadge platform={c.platform} />
                      </td>
                      <td className="px-5 py-3.5">
                        <p className="text-sm font-medium text-slate-800 truncate max-w-[160px]">{c.tenantName}</p>
                        <p className="text-xs text-slate-400 truncate max-w-[160px]">{c.pageName}</p>
                      </td>
                      <td className="px-5 py-3.5 text-sm text-slate-700 truncate max-w-[140px]">{c.authorName}</td>
                      <td className="px-5 py-3.5 text-sm text-slate-600 max-w-[280px]">
                        {truncate(c.originalText)}
                      </td>
                      <td className="px-5 py-3.5">
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border ${actionCfg.className}`}>
                          {actionCfg.label}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-sm text-slate-600 max-w-[280px]">
                        {c.aiReply ? (
                          truncate(c.aiReply)
                        ) : (
                          <span className="text-slate-300">—</span>
                        )}
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
              {data ? `${data.total.toLocaleString('en-US')} comment${data.total === 1 ? '' : 's'}` : ''}
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
