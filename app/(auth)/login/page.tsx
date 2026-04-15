'use client';

import { signIn } from 'next-auth/react';
import { useState, useEffect } from 'react';
import { FacebookIcon } from '@/components/icons/FacebookIcon';
import { Loader2 } from 'lucide-react';

export default function LoginPage() {
  const [loading, setLoading] = useState(false);

  // Facebook sometimes appends #_=_ to the callback URL which confuses
  // NextAuth. Strip it from the browser history before anything processes it.
  useEffect(() => {
    if (window.location.hash === '#_=_') {
      window.history.replaceState(
        null,
        '',
        window.location.href.replace('#_=_', '')
      );
    }
  }, []);

  async function handleLogin() {
    setLoading(true);
    try {
      await signIn('facebook', { callbackUrl: '/' });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center">
      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-10 w-full max-w-sm text-center">
        {/* Logo */}
        <div className="mb-8">
          <div className="h-14 w-14 rounded-2xl bg-indigo-600 flex items-center justify-center mx-auto mb-4">
            <svg viewBox="0 0 24 24" fill="white" className="h-7 w-7">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
            </svg>
          </div>
          <h1 className="text-2xl font-semibold text-slate-900">SocialPulse</h1>
          <p className="mt-1 text-sm text-slate-500">
            AI-powered comment management
          </p>
        </div>

        <div className="space-y-4">
          <p className="text-sm text-slate-600">
            Connect your Facebook account to get started. We&apos;ll link your
            Pages and Instagram accounts automatically.
          </p>

          <button
            onClick={handleLogin}
            disabled={loading}
            className="w-full flex items-center justify-center gap-3 px-4 py-3 bg-[#1877F2] hover:bg-[#166fe5] text-white font-medium rounded-xl transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {loading ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <FacebookIcon className="h-5 w-5" />
            )}
            {loading ? 'Connecting…' : 'Continue with Facebook'}
          </button>
        </div>

        <p className="mt-6 text-xs text-slate-400">
          By connecting, you authorize SocialPulse to manage comments on your
          behalf. You can disconnect at any time.
        </p>
      </div>
    </div>
  );
}
