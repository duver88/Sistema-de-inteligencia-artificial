'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { CommentRow } from '@/components/comments/CommentRow';
import { MessageCircle, Loader2, RefreshCw } from 'lucide-react';

interface ReplyLog {
  id: string;
  originalText: string;
  authorName: string | null;
  action: string;
  platform: string;
  aiReply: string | null;
  aiReplyId: string | null;
  createdAt: string;
  bot: {
    name: string;
    account: { pageName: string };
  };
}

interface BotRepliesListProps {
  botId: string;
  initialReplies?: ReplyLog[];
  initialTotalPages?: number;
}

export function BotRepliesList({ botId, initialReplies, initialTotalPages }: BotRepliesListProps) {
  const [replies, setReplies] = useState<ReplyLog[] | null>(initialReplies ?? null);
  const [error, setError] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(initialTotalPages ?? 1);
  const seeded = useRef(initialReplies !== undefined);

  const fetchReplies = useCallback(async (targetPage: number) => {
    setRefreshing(true);
    setError(false);
    try {
      const params = new URLSearchParams({
        botId,
        action: 'REPLIED,MANUAL_REPLY',
        page: String(targetPage),
      });
      const res = await fetch(`/api/comments?${params.toString()}`, { cache: 'no-store' });
      if (!res.ok) throw new Error();
      const data = await res.json();
      setReplies(data.comments ?? []);
      if (typeof data.totalPages === 'number') setTotalPages(Math.max(1, data.totalPages));
    } catch {
      setError(true);
    } finally {
      setRefreshing(false);
    }
  }, [botId]);

  useEffect(() => {
    if (seeded.current) {
      seeded.current = false;
      return;
    }
    void fetchReplies(page);
  }, [fetchReplies, page]);

  function handleActionComplete(id: string, newAction: string) {
    setReplies(prev =>
      prev ? prev.map(c => c.id === id ? { ...c, action: newAction } : c) : prev
    );
  }

  function handleReplyEdited(id: string, newReply: string) {
    setReplies(prev =>
      prev ? prev.map(c => c.id === id ? { ...c, aiReply: newReply } : c) : prev
    );
  }

  if (replies === null && !error) {
    return (
      <div className="flex items-center justify-center py-24 bg-white border border-slate-200 rounded-2xl shadow-sm">
        <Loader2 className="h-6 w-6 text-slate-400 animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-24 bg-white border border-slate-200 rounded-2xl shadow-sm">
        <p className="text-sm font-semibold text-slate-900 mb-3">Failed to load replies</p>
        <button
          type="button"
          onClick={() => void fetchReplies(page)}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          Retry
        </button>
      </div>
    );
  }

  if (!replies || replies.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24 bg-white border border-slate-200 rounded-2xl shadow-sm">
        <div className="h-14 w-14 bg-slate-100 rounded-2xl flex items-center justify-center mb-4">
          <MessageCircle className="h-7 w-7 text-slate-400" />
        </div>
        <p className="text-sm font-semibold text-slate-900 mb-1">No replies yet</p>
        <p className="text-xs text-slate-500">
          Replies posted by this bot will appear here.
        </p>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-end mb-3">
        <button
          type="button"
          onClick={() => void fetchReplies(page)}
          disabled={refreshing}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      <div className="space-y-2">
        {replies.map(reply => (
          <CommentRow
            key={reply.id}
            comment={reply}
            onActionComplete={handleActionComplete}
            onReplyEdited={handleReplyEdited}
          />
        ))}
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 mt-6">
          {page > 1 && (
            <button
              type="button"
              onClick={() => setPage(p => p - 1)}
              className="px-4 py-2 text-sm font-medium text-slate-600 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors shadow-sm"
            >
              Previous
            </button>
          )}
          <span className="text-sm text-slate-500 px-2">
            Page {page} of {totalPages}
          </span>
          {page < totalPages && (
            <button
              type="button"
              onClick={() => setPage(p => p + 1)}
              className="px-4 py-2 text-sm font-medium text-slate-600 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors shadow-sm"
            >
              Next
            </button>
          )}
        </div>
      )}
    </div>
  );
}
