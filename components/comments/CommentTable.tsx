'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { CommentRow } from './CommentRow';
import { MessageCircle, RefreshCw } from 'lucide-react';
import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';

const POLL_INTERVAL_MS = 5000; // Light polling — refresh /comments every 5s for the live demo

interface Comment {
  id: string;
  originalText: string;
  authorName: string | null;
  action: string;
  platform: string;
  aiReply: string | null;
  aiReplyId?: string | null;
  createdAt: Date | string;
  bot: {
    name: string;
    account: { pageName: string };
  };
}

interface CommentTableProps {
  initialComments: Comment[];
  totalPages: number;
  currentPage: number;
}

export function CommentTable({ initialComments, totalPages, currentPage }: CommentTableProps) {
  const [comments, setComments] = useState(initialComments);
  const [pages, setPages] = useState(totalPages);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const inFlight = useRef(false);

  // Re-sync when the server re-renders with new data (filter / page change)
  useEffect(() => {
    setComments(initialComments);
    setPages(totalPages);
  }, [initialComments, totalPages]);

  function handleActionComplete(id: string, newAction: string) {
    // Deleting a comment makes the whole row disappear from the list straight
    // away, matching what the next refetch will return (the API hides
    // MANUAL_DELETE unless it is asked for explicitly). The row is still in the
    // database — pick "Manual delete" in the action filter to see it.
    if (newAction === 'MANUAL_DELETE' && searchParams.get('action') !== 'MANUAL_DELETE') {
      setComments(prev => prev.filter(c => c.id !== id));
      return;
    }
    setComments(prev =>
      prev.map(c => c.id === id ? { ...c, action: newAction } : c)
    );
  }

  // An empty newReply means the published reply is gone (deleted from Meta),
  // so the row must also drop its aiReplyId — that is what hides the
  // "Edit reply" / "Delete reply" actions.
  function handleReplyEdited(id: string, newReply: string) {
    setComments(prev =>
      prev.map(c =>
        c.id === id
          ? newReply
            ? { ...c, aiReply: newReply }
            : { ...c, aiReply: null, aiReplyId: null }
          : c
      )
    );
  }

  // Fetch the latest comments from the API using the current filters + page
  const fetchLatest = useCallback(async () => {
    if (inFlight.current) return; // Avoid overlapping requests
    inFlight.current = true;
    setRefreshing(true);
    try {
      const params = new URLSearchParams();
      for (const key of ['botId', 'action', 'platform', 'search']) {
        const value = searchParams.get(key);
        if (value) params.set(key, value);
      }
      params.set('page', String(currentPage));

      const res = await fetch(`/api/comments?${params.toString()}`, { cache: 'no-store' });
      if (!res.ok) return;

      const data = await res.json();
      const mapped: Comment[] = (data.comments ?? []).map((c: {
        id: string;
        originalText: string;
        authorName: string | null;
        action: string;
        platform: string;
        aiReply: string | null;
        aiReplyId: string | null;
        createdAt: string;
        bot: Comment['bot'];
      }) => ({
        id: c.id,
        originalText: c.originalText,
        authorName: c.authorName,
        action: c.action,
        platform: c.platform,
        aiReply: c.aiReply,
        aiReplyId: c.aiReplyId,
        createdAt: c.createdAt,
        bot: c.bot,
      }));

      setComments(mapped);
      if (typeof data.totalPages === 'number') setPages(data.totalPages);
      setLastUpdated(new Date());
    } catch {
      // Ignore transient network errors — next tick will retry
    } finally {
      inFlight.current = false;
      setRefreshing(false);
    }
  }, [searchParams, currentPage]);

  // Auto-refresh loop
  useEffect(() => {
    if (!autoRefresh) return;
    const id = setInterval(fetchLatest, POLL_INTERVAL_MS);
    return () => clearInterval(id);
  }, [autoRefresh, fetchLatest]);

  function buildPageUrl(page: number) {
    const params = new URLSearchParams(searchParams.toString());
    params.set('page', String(page));
    return `${pathname}?${params.toString()}`;
  }

  const refreshBar = (
    <div className="flex items-center justify-between mb-3">
      <div className="flex items-center gap-2 text-xs text-slate-500">
        <span className={`h-2 w-2 rounded-full ${autoRefresh ? 'bg-emerald-500 animate-pulse' : 'bg-slate-300'}`} />
        {autoRefresh
          ? <span>Auto-refresh on · every {POLL_INTERVAL_MS / 1000}s</span>
          : <span>Auto-refresh paused</span>}
        {lastUpdated && (
          <span className="text-slate-400">
            · last: {lastUpdated.toLocaleTimeString('en-US')}
          </span>
        )}
      </div>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={fetchLatest}
          disabled={refreshing}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? 'animate-spin' : ''}`} />
          Refresh
        </button>
        <button
          type="button"
          onClick={() => setAutoRefresh(v => !v)}
          className="px-3 py-1.5 text-xs font-medium text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
        >
          {autoRefresh ? 'Pause' : 'Resume'}
        </button>
      </div>
    </div>
  );

  if (comments.length === 0) {
    return (
      <div>
        {refreshBar}
        <div className="flex flex-col items-center justify-center py-24 bg-white border border-slate-200 rounded-2xl shadow-sm">
          <div className="h-14 w-14 bg-slate-100 rounded-2xl flex items-center justify-center mb-4">
            <MessageCircle className="h-7 w-7 text-slate-400" />
          </div>
          <p className="text-sm font-semibold text-slate-900 mb-1">No comments</p>
          <p className="text-xs text-slate-500">
            Waiting for new comments… they will appear here automatically.
          </p>
        </div>
        {/* If we're past the last page (e.g. rows were deleted), let the user
            step back instead of being stranded on an empty page. */}
        {currentPage > 1 && (
          <div className="flex items-center justify-center gap-2 mt-6">
            <Link
              href={buildPageUrl(currentPage - 1)}
              className="px-4 py-2 text-sm font-medium text-slate-600 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors shadow-sm"
            >
              Previous
            </Link>
          </div>
        )}
      </div>
    );
  }

  return (
    <div>
      {refreshBar}
      <div className="space-y-2">
        {comments.map(comment => (
          <CommentRow
            key={comment.id}
            comment={comment}
            onActionComplete={handleActionComplete}
            onReplyEdited={handleReplyEdited}
          />
        ))}
      </div>

      {/* Pagination */}
      {pages > 1 && (
        <div className="flex items-center justify-center gap-2 mt-6">
          {currentPage > 1 && (
            <Link
              href={buildPageUrl(currentPage - 1)}
              className="px-4 py-2 text-sm font-medium text-slate-600 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors shadow-sm"
            >
              Previous
            </Link>
          )}
          <span className="text-sm text-slate-500 px-2">
            Page {currentPage} of {pages}
          </span>
          {currentPage < pages && (
            <Link
              href={buildPageUrl(currentPage + 1)}
              className="px-4 py-2 text-sm font-medium text-slate-600 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors shadow-sm"
            >
              Next
            </Link>
          )}
        </div>
      )}
    </div>
  );
}
