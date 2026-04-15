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
      <div className="h-16 w-16 bg-red-50 rounded-2xl flex items-center justify-center mb-5">
        <AlertTriangle className="h-8 w-8 text-red-600" />
      </div>
      <h2 className="text-base font-semibold text-slate-900 mb-2">Algo salió mal</h2>
      <p className="text-sm text-slate-500 text-center max-w-xs mb-7">
        Ocurrió un error inesperado. Por favor, inténtalo de nuevo.
      </p>
      <button
        onClick={reset}
        className="px-5 py-2.5 text-sm font-bold rounded-xl transition-all shadow-sm hover:shadow-md"
        style={{ background: 'linear-gradient(135deg, #00C4D4, #00E5FF)', color: '#0a1628' }}
      >
        Intentar de nuevo
      </button>
    </div>
  );
}
