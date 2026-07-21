import { PageHeader } from '@/components/layout/PageHeader';
import { UserManagement } from '@/components/admin/UserManagement';
import { requireAdminSession } from '../adminGate';

export default async function AdminUsersPage() {
  const session = await requireAdminSession();
  return (
    <div>
      <PageHeader
        title="Users"
        description="Create, edit, suspend and manage platform users."
      />
      <UserManagement currentUserId={session.user.id} />
    </div>
  );
}
