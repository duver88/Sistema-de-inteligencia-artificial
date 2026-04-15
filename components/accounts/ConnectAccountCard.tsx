'use client';

import { useState } from 'react';
import { Loader2, Plus } from 'lucide-react';
import { toast } from 'sonner';

interface ConnectAccountCardProps {
  onConnected: () => void;
}

export function ConnectAccountCard({ onConnected: _onConnected }: ConnectAccountCardProps) {
  const [loading, setLoading] = useState(false);

  async function handleConnect() {
    setLoading(true);
    try {
      const res = await fetch('/api/accounts/connect');
      const data = await res.json() as { authUrl?: string; error?: string };
      if (!res.ok || !data.authUrl) {
        throw new Error(data.error ?? 'Error al iniciar la conexión');
      }
      // Redirect to Facebook OAuth
      window.location.href = data.authUrl;
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error al conectar cuenta');
      setLoading(false);
    }
  }

  return (
    <button
      onClick={handleConnect}
      disabled={loading}
      className="inline-flex items-center gap-2 px-4 py-2.5 text-white text-sm font-bold rounded-xl transition-all shadow-md hover:shadow-lg active:scale-95 disabled:opacity-70 disabled:cursor-not-allowed"
      style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)' }}
    >
      {loading ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <Plus className="h-4 w-4" />
      )}
      {loading ? 'Redirigiendo…' : 'Conectar Cuenta'}
    </button>
  );
}
