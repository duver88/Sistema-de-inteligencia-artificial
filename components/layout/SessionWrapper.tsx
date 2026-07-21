'use client';

import { SessionProvider } from 'next-auth/react';
import type { Session } from 'next-auth';

// `session` is the server-side session from `auth()`. Passing it makes
// useSession() resolve synchronously on first render (no undefined window),
// so role-dependent UI like the sidebar renders correctly on first paint
// instead of flashing the wrong navigation while /api/auth/session loads.
export function SessionWrapper({
  children,
  session,
}: {
  children: React.ReactNode;
  session?: Session | null;
}) {
  return <SessionProvider session={session}>{children}</SessionProvider>;
}
