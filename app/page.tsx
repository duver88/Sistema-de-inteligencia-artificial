import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';

export default async function RootPage() {
  // Superadmins are administrators only: their home is the admin panel.
  const session = await auth();
  if (session?.user?.isSuperAdmin) redirect('/admin');

  redirect('/overview');
}
