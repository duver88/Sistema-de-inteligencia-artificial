import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { PageHeader } from '@/components/layout/PageHeader';
import { AdminPanel } from '@/components/admin/AdminPanel';

export default async function AdminPage() {
  const session = await auth();
  if (!session?.user?.isSuperAdmin) redirect('/');

  return (
    <div>
      <PageHeader
        title="Admin Panel"
        description="Platform overview, user management and AI configuration."
      />
      <AdminPanel currentUserId={session.user.id} />
    </div>
  );
}
