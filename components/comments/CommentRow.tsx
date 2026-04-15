'use client';

import { useState } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { MessageSquare, Trash2, Loader2, ChevronDown, ChevronUp } from 'lucide-react';
import { CommentStatusBadge } from './CommentStatusBadge';
import { toast } from 'sonner';

interface CommentRowProps {
  comment: {
    id: string;
    originalText: string;
    authorName: string | null;
    action: string;
    platform: string;
    aiReply: string | null;
    createdAt: Date | string;
    bot: {
      name: string;
      account: { pageName: string };
    };
  };
  onActionComplete: (id: string, newAction: string) => void;
}

export function CommentRow({ comment, onActionComplete }: CommentRowProps) {
  const [expanded, setExpanded] = useState(false);
  const [replyText, setReplyText] = useState('');
  const [loading, setLoading] = useState<'reply' | 'delete' | null>(null);

  const canReply = !['DELETED', 'MANUAL_DELETE'].includes(comment.action);
  const canDelete = !['DELETED', 'MANUAL_DELETE'].includes(comment.action);

  async function handleReply() {
    if (!replyText.trim()) return;
    setLoading('reply');
    try {
      const res = await fetch(`/api/comments/${comment.id}/reply`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ replyText: replyText.trim() }),
      });
      if (!res.ok) throw new Error();
      toast.success('Reply sent');
      setReplyText('');
      setExpanded(false);
      onActionComplete(comment.id, 'MANUAL_REPLY');
    } catch {
      toast.error('Failed to send reply');
    } finally {
      setLoading(null);
    }
  }

  async function handleDelete() {
    setLoading('delete');
    try {
      const res = await fetch(`/api/comments/${comment.id}/delete`, { method: 'POST' });
      if (!res.ok) throw new Error();
      toast.success('Comment deleted');
      onActionComplete(comment.id, 'MANUAL_DELETE');
    } catch {
      toast.error('Failed to delete comment');
    } finally {
      setLoading(null);
    }
  }

  const timeAgo = formatDistanceToNow(new Date(comment.createdAt), { addSuffix: true });

  return (
    <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
      <div className="px-4 py-3 flex items-start gap-3">
        {/* Avatar placeholder */}
        <div className="h-8 w-8 rounded-full bg-slate-200 flex items-center justify-center flex-shrink-0 text-xs font-semibold text-slate-600">
          {(comment.authorName ?? '?')[0].toUpperCase()}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <span className="text-sm font-semibold text-slate-900">
              {comment.authorName ?? 'Unknown'}
            </span>
            <span className="text-xs text-slate-400">{timeAgo}</span>
            <span className="text-xs text-slate-400">·</span>
            <span className="text-xs text-slate-400">{comment.bot.account.pageName}</span>
            <span className="text-xs text-slate-400">·</span>
            <span className="text-xs text-slate-500 capitalize">{comment.platform.toLowerCase()}</span>
          </div>
          <p className="text-sm text-slate-700 line-clamp-2">{comment.originalText}</p>
          {comment.aiReply && (
            <p className="mt-1.5 text-xs text-slate-500 italic line-clamp-1">
              ↳ {comment.aiReply}
            </p>
          )}
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          <CommentStatusBadge action={comment.action} />

          {canReply && (
            <button
              onClick={() => setExpanded(v => !v)}
              className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
              title="Reply"
            >
              {expanded ? <ChevronUp className="h-4 w-4" /> : <MessageSquare className="h-4 w-4" />}
            </button>
          )}

          {canDelete && (
            <button
              onClick={() => void handleDelete()}
              disabled={loading === 'delete'}
              className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
              title="Delete"
            >
              {loading === 'delete' ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Trash2 className="h-4 w-4" />
              )}
            </button>
          )}
        </div>
      </div>

      {/* Reply form */}
      {expanded && (
        <div className="border-t border-slate-100 px-4 py-3 bg-slate-50">
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="Write a reply…"
              value={replyText}
              onChange={e => setReplyText(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') void handleReply(); }}
              className="flex-1 text-sm border border-slate-200 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            />
            <button
              onClick={() => void handleReply()}
              disabled={!replyText.trim() || loading === 'reply'}
              className="flex items-center gap-1.5 px-3 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50"
            >
              {loading === 'reply' ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
              Send
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
