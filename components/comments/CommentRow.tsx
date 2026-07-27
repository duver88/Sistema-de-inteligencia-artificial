'use client';

import { useState } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { enUS } from 'date-fns/locale';
import { MessageSquare, MessageSquareX, Trash2, Loader2, ChevronUp, Pencil } from 'lucide-react';
import { CommentStatusBadge } from './CommentStatusBadge';
import { toast } from 'sonner';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

interface CommentRowProps {
  comment: {
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
  };
  onActionComplete: (id: string, newAction: string) => void;
  onReplyEdited?: (id: string, newReply: string) => void;
}

export function CommentRow({ comment, onActionComplete, onReplyEdited }: CommentRowProps) {
  const [expanded, setExpanded] = useState(false);
  const [editing, setEditing] = useState(false);
  const [replyText, setReplyText] = useState('');
  const [editText, setEditText] = useState('');
  const [loading, setLoading] = useState<'reply' | 'delete' | 'edit' | 'deleteReply' | null>(null);

  const canReply = !['DELETED', 'MANUAL_DELETE'].includes(comment.action);
  const canDelete = !['DELETED', 'MANUAL_DELETE'].includes(comment.action);
  const canEditReply =
    comment.platform === 'FACEBOOK' &&
    !!comment.aiReplyId &&
    ['REPLIED', 'MANUAL_REPLY'].includes(comment.action);
  // Deleting a published reply works on both Facebook and Instagram.
  const canDeleteReply =
    !!comment.aiReplyId && ['REPLIED', 'MANUAL_REPLY'].includes(comment.action);
  // Both delete dialogs are shown for Instagram rows too, so the copy has to
  // name the right network instead of always saying "Facebook".
  const network = comment.platform === 'INSTAGRAM' ? 'Instagram' : 'Facebook';

  async function handleReply() {
    if (!replyText.trim()) return;
    // Guard against double-submit (Enter pressed twice, or Enter while a click
    // is in flight) — otherwise the reply is published twice on Meta.
    if (loading === 'reply') return;
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

  async function handleEditReply() {
    if (!editText.trim()) return;
    setLoading('edit');
    try {
      const res = await fetch(`/api/comments/${comment.id}/edit-reply`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ replyText: editText.trim() }),
      });
      if (!res.ok) throw new Error();
      toast.success('Reply updated');
      setEditing(false);
      onReplyEdited?.(comment.id, editText.trim());
    } catch {
      toast.error('Failed to update reply');
    } finally {
      setLoading(null);
    }
  }

  async function handleDeleteReply() {
    // The confirm button does not close the dialog, so guard against a second
    // click while the first request is in flight — otherwise the retry hits a
    // log with no aiReplyId and reports a spurious failure.
    if (loading === 'deleteReply') return;
    setLoading('deleteReply');
    try {
      const res = await fetch(`/api/comments/${comment.id}/delete-reply`, { method: 'POST' });
      if (!res.ok) throw new Error();
      toast.success('Reply deleted');
      setEditing(false);
      // Clear the stored reply as well — an empty reply tells the parent the
      // published reply is gone, so the row stops offering edit/delete reply.
      onReplyEdited?.(comment.id, '');
      onActionComplete(comment.id, 'REPLY_DELETED');
    } catch {
      toast.error('Failed to delete reply');
    } finally {
      setLoading(null);
    }
  }

  async function handleDelete() {
    // Same double-submit guard as handleDeleteReply — a second delete of an
    // already deleted comment fails on Meta and shows a false error toast.
    if (loading === 'delete') return;
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

  const timeAgo = formatDistanceToNow(new Date(comment.createdAt), { addSuffix: true, locale: enUS });

  return (
    <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-shadow">
      <div className="px-5 py-4 flex items-start gap-3">
        {/* Avatar placeholder */}
        <div className="h-9 w-9 rounded-full bg-gradient-to-br from-cyan-100 to-cyan-200 flex items-center justify-center flex-shrink-0 text-xs font-semibold text-cyan-700">
          {(comment.authorName ?? '?')[0].toUpperCase()}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <span className="text-sm font-semibold text-slate-900">
              {comment.authorName ?? 'Unknown'}
            </span>
            <span className="text-xs text-slate-400">{timeAgo}</span>
            <span className="text-xs text-slate-300">·</span>
            <span className="text-xs text-slate-400">{comment.bot.account.pageName}</span>
            <span className="text-xs text-slate-300">·</span>
            <span className="text-xs text-slate-500 capitalize">
              {comment.platform === 'FACEBOOK' ? 'Facebook' : comment.platform === 'INSTAGRAM' ? 'Instagram' : comment.platform.toLowerCase()}
            </span>
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

          {canEditReply && (
            <button
              onClick={() => {
                if (editing) {
                  setEditing(false);
                } else {
                  setEditText(comment.aiReply ?? '');
                  setEditing(true);
                  setExpanded(false);
                }
              }}
              className="p-1.5 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded-xl transition-colors"
              title="Edit reply"
            >
              {editing ? <ChevronUp className="h-4 w-4" /> : <Pencil className="h-4 w-4" />}
            </button>
          )}

          {canReply && (
            <button
              onClick={() => { setExpanded(v => !v); setEditing(false); }}
              className="p-1.5 text-slate-400 hover:text-cyan-600 hover:bg-cyan-50 rounded-xl transition-colors"
              title="Reply"
            >
              {expanded ? <ChevronUp className="h-4 w-4" /> : <MessageSquare className="h-4 w-4" />}
            </button>
          )}

          {canDeleteReply && (
            <AlertDialog>
              <AlertDialogTrigger
                disabled={loading === 'deleteReply'}
                className="p-1.5 text-slate-400 hover:text-orange-600 hover:bg-orange-50 rounded-xl transition-colors disabled:opacity-50"
                title="Delete the reply published by your Page"
              >
                {loading === 'deleteReply' ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <MessageSquareX className="h-4 w-4" />
                )}
              </AlertDialogTrigger>
              <AlertDialogContent className="bg-white">
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete the reply?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This removes only the reply your Page published on {network}. The original
                    comment from the user stays visible.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={() => void handleDeleteReply()}
                    disabled={loading === 'deleteReply'}
                    className="bg-orange-600 hover:bg-orange-700 text-white"
                  >
                    {loading === 'deleteReply' ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : null}
                    Delete reply
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}

          {canDelete && (
            <AlertDialog>
              <AlertDialogTrigger
                disabled={loading === 'delete'}
                className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-colors disabled:opacity-50"
                title="Delete"
              >
                {loading === 'delete' ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Trash2 className="h-4 w-4" />
                )}
              </AlertDialogTrigger>
              <AlertDialogContent className="bg-white">
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete this comment?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This deletes the user&apos;s comment on {network}. {network} also removes any
                    reply your Page published underneath it. This cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={() => void handleDelete()}
                    disabled={loading === 'delete'}
                    className="bg-red-600 hover:bg-red-700 text-white"
                  >
                    {loading === 'delete' ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : null}
                    Delete comment
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
        </div>
      </div>

      {/* Reply form */}
      {expanded && (
        <div className="border-t border-slate-100 px-5 py-3.5 bg-slate-50">
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="Write a reply…"
              value={replyText}
              onChange={e => setReplyText(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') void handleReply(); }}
              className="flex-1 text-sm border border-slate-200 rounded-xl px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:border-transparent"
            />
            <button
              onClick={() => void handleReply()}
              disabled={!replyText.trim() || loading === 'reply'}
              className="flex items-center gap-1.5 px-4 py-2 text-sm font-bold rounded-xl transition-all disabled:opacity-50"
              style={{ background: 'linear-gradient(135deg, #00C4D4, #00E5FF)', color: '#0a1628' }}
            >
              {loading === 'reply' ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
              Send
            </button>
          </div>
        </div>
      )}

      {/* Edit reply form */}
      {editing && (
        <div className="border-t border-slate-100 px-5 py-3.5 bg-slate-50">
          <textarea
            value={editText}
            onChange={e => setEditText(e.target.value)}
            rows={3}
            placeholder="Edit the reply…"
            className="w-full text-sm border border-slate-200 rounded-xl px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:border-transparent resize-y"
          />
          <div className="flex justify-end gap-2 mt-2">
            <button
              onClick={() => setEditing(false)}
              disabled={loading === 'edit'}
              className="px-4 py-2 text-sm font-medium text-slate-600 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              onClick={() => void handleEditReply()}
              disabled={!editText.trim() || loading === 'edit'}
              className="flex items-center gap-1.5 px-4 py-2 text-sm font-bold rounded-xl transition-all disabled:opacity-50"
              style={{ background: 'linear-gradient(135deg, #00C4D4, #00E5FF)', color: '#0a1628' }}
            >
              {loading === 'edit' ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
              Save
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
