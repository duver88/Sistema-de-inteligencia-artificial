'use client';

import { LogOut, ChevronDown, Bell } from 'lucide-react';
import { signOut } from 'next-auth/react';
import { useSession } from 'next-auth/react';
import { useState } from 'react';

export function TopBar() {
  const { data: session } = useSession();
  const [open, setOpen] = useState(false);

  return (
    <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-6 shrink-0">
      <div />
      <div className="flex items-center gap-3">
        {/* Bell icon */}
        <button className="h-9 w-9 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors">
          <Bell className="h-4 w-4" />
        </button>

        {/* User menu */}
        <div className="relative">
          <button
            onClick={() => setOpen(v => !v)}
            className="flex items-center gap-2.5 pl-1 pr-3 py-1 rounded-xl hover:bg-slate-50 transition-colors border border-transparent hover:border-slate-200"
          >
            {session?.user?.image ? (
              <img
                src={session.user.image}
                alt={session.user.name ?? 'Usuario'}
                className="h-8 w-8 rounded-full object-cover"
              />
            ) : (
              <div className="h-8 w-8 rounded-full flex items-center justify-center text-[#0a1628] text-xs font-bold" style={{background: 'linear-gradient(135deg, #00C4D4, #00E5FF)'}}>
                {(session?.user?.name ?? 'U')[0].toUpperCase()}
              </div>
            )}
            <div className="hidden sm:block text-left">
              <p className="text-sm font-semibold text-slate-800 leading-tight max-w-[120px] truncate">
                {session?.user?.name ?? 'Usuario'}
              </p>
              <p className="text-xs text-slate-400 leading-tight max-w-[120px] truncate">
                {session?.user?.email ?? ''}
              </p>
            </div>
            <ChevronDown className="h-3.5 w-3.5 text-slate-400" />
          </button>

          {open && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
              <div className="absolute right-0 top-12 z-20 w-52 bg-white border border-slate-200 rounded-2xl shadow-xl py-1.5 overflow-hidden">
                <div className="px-4 py-3 border-b border-slate-100 bg-slate-50">
                  <p className="text-sm font-semibold text-slate-900 truncate">{session?.user?.name}</p>
                  <p className="text-xs text-slate-500 truncate mt-0.5">{session?.user?.email}</p>
                </div>
                <button
                  onClick={() => signOut({ callbackUrl: '/login' })}
                  className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors"
                >
                  <LogOut className="h-4 w-4" />
                  Cerrar sesión
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
