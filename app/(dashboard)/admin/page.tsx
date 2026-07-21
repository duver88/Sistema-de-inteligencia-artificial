import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { PageHeader } from '@/components/layout/PageHeader';
import { UserManagement } from '@/components/admin/UserManagement';

export default async function AdminPage() {
  const session = await auth();
  if (!session?.user?.isSuperAdmin) redirect('/');

  return (
    <div>
      <PageHeader
        title="Admin Panel"
        description="Manage platform users, their tenants and access."
      />
      <UserManagement currentUserId={session.user.id} />
    </div>
  );
}
