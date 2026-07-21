import { PageHeader } from '@/components/layout/PageHeader';
import { PagesAndBotsPanel } from '@/components/admin/PagesAndBotsPanel';
import { requireAdminSession } from '../adminGate';

export default async function AdminPagesPage() {
  await requireAdminSession();
  return (
    <div>
      <PageHeader
        title="Pages & Bots"
        description="All connected pages and bots across every workspace."
      />
      <PagesAndBotsPanel />
    </div>
  );
}
