import { PageHeader } from '@/components/layout/PageHeader';
import { PlansPanel } from '@/components/admin/PlansPanel';
import { requireAdminSession } from '../adminGate';

export default async function AdminPlansPage() {
  await requireAdminSession();
  return (
    <div>
      <PageHeader
        title="Plans"
        description="Assign plans and enforce page and bot limits per workspace."
      />
      <PlansPanel />
    </div>
  );
}
