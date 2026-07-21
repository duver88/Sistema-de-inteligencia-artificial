'use client';

import { signIn } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useState } from 'react';
import { LionsCoreIcon } from '@/components/icons/LionsCoreIcon';
import { Loader2 } from 'lucide-react';

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Honor the callbackUrl the middleware appends when it bounces an
  // unauthenticated deep link to /login. Only accept same-origin relative
  // paths ('/x' but not '//host' or '/\host') to avoid an open redirect.
  const rawCallbackUrl = searchParams.get('callbackUrl');
  const callbackUrl =
    rawCallbackUrl && /^\/(?![/\\])/.test(rawCallbackUrl) ? rawCallbackUrl : '/';

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await signIn('credentials', {
        email,
        password,
        redirect: false,
      });

      if (res?.error) {
        setError('Invalid email or password');
        setLoading(false);
        return;
      }

      router.push(callbackUrl);
      router.refresh();
    } catch {
      setError('Invalid email or password');
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
          <h1 className="text-2xl font-black text-slate-900 mb-1">Sign in</h1>
          <p className="text-slate-500 text-sm mb-7">
            Enter your email and password to access your account.
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-semibold text-slate-700 mb-1.5">
                Email
              </label>
              <input
                id="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="you@company.com"
                className="w-full px-4 py-3 rounded-xl border border-slate-200 text-slate-900 text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#0bbfb8] focus:border-transparent transition-all"
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-semibold text-slate-700 mb-1.5">
                Password
              </label>
              <input
                id="password"
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-4 py-3 rounded-xl border border-slate-200 text-slate-900 text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#0bbfb8] focus:border-transparent transition-all"
              />
            </div>

            {error && (
              <p className="text-sm text-red-600 font-medium">{error}</p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-3 px-4 py-3.5 font-bold rounded-xl transition-all disabled:opacity-60 disabled:cursor-not-allowed shadow-lg hover:shadow-xl active:scale-[0.98]"
              style={{ background: 'linear-gradient(135deg, #0bbfb8, #12fdee)', color: '#021130' }}
            >
              {loading && <Loader2 className="h-5 w-5 animate-spin" />}
              {loading ? 'Signing in…' : 'Sign in'}
            </button>
          </form>

          <p className="mt-6 text-xs text-slate-400 text-center leading-relaxed">
            Access is by invitation only. Contact your administrator if you need an account.
          </p>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  // useSearchParams() requires a Suspense boundary during prerendering
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  );
}
