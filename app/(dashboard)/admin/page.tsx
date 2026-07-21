import { PageHeader } from '@/components/layout/PageHeader';
import { AdminOverview } from '@/components/admin/AdminOverview';
import { requireAdminSession } from './adminGate';

export default async function AdminOverviewPage() {
  await requireAdminSession();
  return (
    <div>
      <PageHeader
        title="Overview"
        description="Platform activity, users, pages and AI usage at a glance."
      />
      <AdminOverview />
    </div>
  );
}
