import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';

/**
 * Server-side gate for every admin route: returns the session for super
 * admins, redirects everyone else to the home page. Each admin page calls
 * this before rendering.
 */
export async function requireAdminSession() {
  const session = await auth();
  if (!session?.user?.isSuperAdmin) redirect('/');
  return session;
}
