'use client';

import { useState } from 'react';
import { CommentRow } from './CommentRow';
import { MessageCircle } from 'lucide-react';
import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';

interface Comment {
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
}

interface CommentTableProps {
  initialComments: Comment[];
  totalPages: number;
  currentPage: number;
}

export function CommentTable({ initialComments, totalPages, currentPage }: CommentTableProps) {
  const [comments, setComments] = useState(initialComments);
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function handleActionComplete(id: string, newAction: string) {
    setComments(prev =>
      prev.map(c => c.id === id ? { ...c, action: newAction } : c)
    );
  }

  function buildPageUrl(page: number) {
    const params = new URLSearchParams(searchParams.toString());
    params.set('page', String(page));
    return `${pathname}?${params.toString()}`;
  }

  if (comments.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24 bg-white border border-slate-200 rounded-2xl shadow-sm">
        <div className="h-14 w-14 bg-slate-100 rounded-2xl flex items-center justify-center mb-4">
          <MessageCircle className="h-7 w-7 text-slate-400" />
        </div>
        <p className="text-sm font-semibold text-slate-900 mb-1">Sin comentarios</p>
        <p className="text-xs text-slate-500">Intenta ajustar los filtros.</p>
      </div>
    );
  }

  return (
    <div>
      <div className="space-y-2">
        {comments.map(comment => (
          <CommentRow
            key={comment.id}
            comment={comment}
            onActionComplete={handleActionComplete}
          />
        ))}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 mt-6">
          {currentPage > 1 && (
            <Link
              href={buildPageUrl(currentPage - 1)}
              className="px-4 py-2 text-sm font-medium text-slate-600 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors shadow-sm"
            >
              Anterior
            </Link>
          )}
          <span className="text-sm text-slate-500 px-2">
            Página {currentPage} de {totalPages}
          </span>
          {currentPage < totalPages && (
            <Link
              href={buildPageUrl(currentPage + 1)}
              className="px-4 py-2 text-sm font-medium text-slate-600 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors shadow-sm"
            >
              Siguiente
            </Link>
          )}
        </div>
      )}
    </div>
  );
}
