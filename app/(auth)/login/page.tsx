'use client';

import { signIn } from 'next-auth/react';
import { useState, useEffect } from 'react';
import { FacebookIcon } from '@/components/icons/FacebookIcon';
import { Loader2, Zap } from 'lucide-react';

export default function LoginPage() {
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (window.location.hash === '#_=_') {
      window.history.replaceState(null, '', window.location.href.replace('#_=_', ''));
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
    <div
      className="min-h-screen flex items-center justify-center p-6"
      style={{background: 'linear-gradient(135deg, #0f172a 0%, #1e1b4b 50%, #0f172a 100%)'}}
    >
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="flex items-center justify-center gap-3 mb-8">
          <div className="h-11 w-11 rounded-xl flex items-center justify-center" style={{background: 'linear-gradient(135deg, #6366f1, #8b5cf6)'}}>
            <Zap className="h-5 w-5 text-white" />
          </div>
          <span className="text-white font-bold text-2xl">LionsCore</span>
        </div>

        {/* Card */}
        <div className="bg-white rounded-3xl shadow-2xl p-8">
          <h1 className="text-2xl font-black text-slate-900 mb-1">Iniciar sesión</h1>
          <p className="text-slate-500 text-sm mb-7">
            Conecta tu cuenta de Facebook para comenzar.
          </p>

          <button
            onClick={handleLogin}
            disabled={loading}
            className="w-full flex items-center justify-center gap-3 px-4 py-3.5 text-white font-bold rounded-xl transition-all disabled:opacity-60 disabled:cursor-not-allowed shadow-lg hover:shadow-xl active:scale-[0.98]"
            style={{background: 'linear-gradient(135deg, #1877F2, #0d65d9)'}}
          >
            {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <FacebookIcon className="h-5 w-5" />}
            {loading ? 'Conectando…' : 'Continuar con Facebook'}
          </button>

          <p className="mt-6 text-xs text-slate-400 text-center leading-relaxed">
            Al conectar, autorizas a LionsCore a gestionar comentarios en tu nombre.
            Puedes desconectar en cualquier momento.
          </p>
        </div>
      </div>
    </div>
  );
}
