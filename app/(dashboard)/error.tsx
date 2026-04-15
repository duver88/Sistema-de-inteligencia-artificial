'use client';

import { useEffect } from 'react';
import { AlertTriangle } from 'lucide-react';

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh]">
      <div className="h-14 w-14 bg-red-50 rounded-xl flex items-center justify-center mb-4">
        <AlertTriangle className="h-7 w-7 text-red-600" />
      </div>
      <h2 className="text-base font-semibold text-slate-900 mb-1">Something went wrong</h2>
      <p className="text-sm text-slate-500 text-center max-w-xs mb-6">
        An unexpected error occurred. Please try again.
      </p>
      <button
        onClick={reset}
        className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-xl transition-colors"
      >
        Try again
      </button>
    </div>
  );
}
