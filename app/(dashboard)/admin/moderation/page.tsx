import { PageHeader } from '@/components/layout/PageHeader';
import { ModerationPanel } from '@/components/admin/ModerationPanel';
import { requireAdminSession } from '../adminGate';

export default async function AdminModerationPage() {
  await requireAdminSession();
  return (
    <div>
      <PageHeader
        title="Moderation"
        description="Every comment processed across the platform."
      />
      <ModerationPanel />
    </div>
  );
}
