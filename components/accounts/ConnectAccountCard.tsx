'use client';

import { useState } from 'react';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { FacebookIcon } from '@/components/icons/FacebookIcon';

interface ConnectAccountCardProps {
  onConnected: () => void;
}

// Facebook-brand "Continue with Facebook" button (Meta brand guidelines: the
// official "f" mark before the label, Facebook blue #1877F2, white text).
export function ConnectAccountCard({ onConnected: _onConnected }: ConnectAccountCardProps) {
  const [loading, setLoading] = useState(false);

  async function handleConnect() {
    setLoading(true);
    try {
      const res = await fetch('/api/accounts/connect');
      const data = await res.json() as { authUrl?: string; error?: string };
      if (!res.ok || !data.authUrl) {
        throw new Error(data.error ?? 'Failed to start the connection');
      }
      // Redirect to Facebook OAuth
      window.location.href = data.authUrl;
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to connect account');
      setLoading(false);
    }
  }

  return (
    <button
      onClick={handleConnect}
      disabled={loading}
      className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-semibold text-white rounded-xl transition-all shadow-md hover:shadow-lg hover:brightness-95 active:scale-95 disabled:opacity-70 disabled:cursor-not-allowed"
      style={{ backgroundColor: '#1877F2' }}
    >
      {loading ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <FacebookIcon className="h-4 w-4" />
      )}
      {loading ? 'Redirecting…' : 'Continue with Facebook'}
    </button>
  );
}
