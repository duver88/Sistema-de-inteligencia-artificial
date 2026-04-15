'use client';

import { LogOut, ChevronDown } from 'lucide-react';
import { signOut } from 'next-auth/react';
import { useSession } from 'next-auth/react';
import { useState } from 'react';

export function TopBar() {
  const { data: session } = useSession();
  const [open, setOpen] = useState(false);

  return (
    <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-end px-6 shadow-sm">
      <div className="relative">
        <button
          onClick={() => setOpen(v => !v)}
          className="flex items-center gap-2.5 text-sm font-medium text-slate-700 hover:text-slate-900 transition-colors px-3 py-1.5 rounded-xl hover:bg-slate-50"
        >
          {session?.user?.image ? (
            <img
              src={session.user.image}
              alt={session.user.name ?? 'Usuario'}
              className="h-8 w-8 rounded-full object-cover ring-2 ring-indigo-100"
            />
          ) : (
            <div className="h-8 w-8 rounded-full bg-gradient-to-br from-indigo-500 to-indigo-600 flex items-center justify-center ring-2 ring-indigo-100">
              <span className="text-white text-xs font-semibold">
                {(session?.user?.name ?? 'U')[0].toUpperCase()}
              </span>
            </div>
          )}
          <span className="hidden sm:block max-w-[140px] truncate">
            {session?.user?.name ?? session?.user?.email ?? 'Usuario'}
          </span>
          <ChevronDown className="h-4 w-4 text-slate-400" />
        </button>

        {open && (
          <>
            {/* Backdrop */}
            <div
              className="fixed inset-0 z-10"
              onClick={() => setOpen(false)}
            />
            <div className="absolute right-0 top-11 z-20 w-52 bg-white border border-slate-200 rounded-2xl shadow-xl py-1.5 overflow-hidden">
              <div className="px-4 py-3 border-b border-slate-100">
                <p className="text-sm font-semibold text-slate-900 truncate">
                  {session?.user?.name}
                </p>
                <p className="text-xs text-slate-500 truncate mt-0.5">
                  {session?.user?.email}
                </p>
              </div>
              <button
                onClick={() => signOut({ callbackUrl: '/login' })}
                className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 transition-colors"
              >
                <LogOut className="h-4 w-4 text-slate-400" />
                Cerrar sesión
              </button>
            </div>
          </>
        )}
      </div>
    </header>
  );
}
