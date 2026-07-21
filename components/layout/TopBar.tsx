'use client';

import { LogOut, ChevronDown } from 'lucide-react';
import { signOut } from 'next-auth/react';
import { useSession } from 'next-auth/react';
import { useState } from 'react';
import { UserAvatar } from '@/components/ui/UserAvatar';

export function TopBar() {
  const { data: session } = useSession();
  const [open, setOpen] = useState(false);

  const userName = session?.user?.name ?? 'User';
  // /api/me/avatar proxies the Facebook profile picture and only has one for
  // tenant users who connected Facebook. Super admins can never connect
  // Facebook, so skip the request entirely for them; for everyone else
  // UserAvatar falls back to an initials circle if the proxy has no photo.
  const avatarSrc = session?.user && !session.user.isSuperAdmin
    ? '/api/me/avatar'
    : undefined;

  return (
    <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-6 shrink-0">
      <div />
      <div className="flex items-center gap-3">
        {/* User menu */}
        <div className="relative">
          <button
            onClick={() => setOpen(v => !v)}
            className="flex items-center gap-2.5 pl-1 pr-3 py-1 rounded-xl hover:bg-slate-50 transition-colors border border-transparent hover:border-slate-200"
          >
            <UserAvatar name={userName} image={avatarSrc} size={32} />
            <div className="hidden sm:block text-left">
              <p className="text-sm font-semibold text-slate-800 leading-tight max-w-[120px] truncate">
                {userName}
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
                  Sign out
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
