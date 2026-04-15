'use client';

import { signIn } from 'next-auth/react';
import { useState, useEffect } from 'react';
import { FacebookIcon } from '@/components/icons/FacebookIcon';
import { LionsCoreIcon } from '@/components/icons/LionsCoreIcon';
import { Loader2 } from 'lucide-react';

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
      style={{ background: '#021130' }}
    >
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="flex items-center justify-center gap-3 mb-8">
          <LionsCoreIcon size={44} />
          <div className="flex items-baseline gap-1">
            <span className="text-white font-bold text-3xl tracking-tight">Lionscore</span>
            <span className="text-lg font-semibold" style={{ color: '#12fdee' }}>ai</span>
          </div>
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
            style={{ background: 'linear-gradient(135deg, #1877F2, #0d65d9)' }}
          >
            {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <FacebookIcon className="h-5 w-5" />}
            {loading ? 'Conectando…' : 'Continuar con Facebook'}
          </button>

          <p className="mt-6 text-xs text-slate-400 text-center leading-relaxed">
            Al conectar, autorizas a Lionscore a gestionar comentarios en tu nombre.
            Puedes desconectar en cualquier momento.
          </p>
        </div>
      </div>
    </div>
  );
}
