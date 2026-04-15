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
    <div className="min-h-screen flex" style={{background: 'linear-gradient(135deg, #1e1b4b 0%, #312e81 50%, #4c1d95 100%)'}}>
      {/* Left decorative panel */}
      <div className="hidden lg:flex lg:w-1/2 flex-col justify-between p-12">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-xl bg-white/20 flex items-center justify-center">
            <Zap className="h-5 w-5 text-white" />
          </div>
          <span className="text-white font-bold text-xl">SocialPulse</span>
        </div>
        <div>
          <h2 className="text-4xl font-black text-white leading-tight mb-4">
            Gestión de comentarios<br />
            <span className="text-indigo-300">potenciada por IA</span>
          </h2>
          <p className="text-indigo-200 text-lg">
            Modera, responde y analiza comentarios de Facebook e Instagram de forma automática.
          </p>
          <div className="mt-8 flex flex-col gap-3">
            {[
              'Respuestas automáticas con IA',
              'Moderación inteligente de spam',
              'Base de conocimiento personalizada',
            ].map(feat => (
              <div key={feat} className="flex items-center gap-3">
                <div className="h-5 w-5 rounded-full bg-indigo-400/30 flex items-center justify-center flex-shrink-0">
                  <div className="h-2 w-2 rounded-full bg-indigo-300" />
                </div>
                <span className="text-indigo-100 text-sm">{feat}</span>
              </div>
            ))}
          </div>
        </div>
        <p className="text-indigo-400 text-xs">© 2024 SocialPulse. Todos los derechos reservados.</p>
      </div>

      {/* Right: login form */}
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-sm">
          {/* Mobile logo */}
          <div className="lg:hidden flex items-center gap-3 justify-center mb-8">
            <div className="h-10 w-10 rounded-xl bg-white/20 flex items-center justify-center">
              <Zap className="h-5 w-5 text-white" />
            </div>
            <span className="text-white font-bold text-xl">SocialPulse</span>
          </div>

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
              Al conectar, autorizas a SocialPulse a gestionar comentarios en tu nombre.
              Puedes desconectar en cualquier momento.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
