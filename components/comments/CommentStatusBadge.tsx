type Action = 'REPLIED' | 'DELETED' | 'HIDDEN' | 'IGNORED' | 'MANUAL_REPLY' | 'MANUAL_DELETE' | 'ERROR';

const ACTION_CONFIG: Record<Action, { label: string; className: string }> = {
  REPLIED:       { label: 'Replied',        className: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  DELETED:       { label: 'Deleted',        className: 'bg-red-50 text-red-700 border-red-200' },
  HIDDEN:        { label: 'Hidden',         className: 'bg-amber-50 text-amber-700 border-amber-200' },
  IGNORED:       { label: 'Ignored',        className: 'bg-slate-100 text-slate-600 border-slate-200' },
  MANUAL_REPLY:  { label: 'Manual Reply',   className: 'bg-blue-50 text-blue-700 border-blue-200' },
  MANUAL_DELETE: { label: 'Manual Delete',  className: 'bg-red-50 text-red-700 border-red-200' },
  ERROR:         { label: 'Error',          className: 'bg-red-50 text-red-700 border-red-200' },
};

export function CommentStatusBadge({ action }: { action: string }) {
  const config = ACTION_CONFIG[action as Action] ?? ACTION_CONFIG.IGNORED;
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium border ${config.className}`}>
      {config.label}
    </span>
  );
}
