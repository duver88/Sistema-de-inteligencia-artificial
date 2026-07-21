import { PageHeader } from '@/components/layout/PageHeader';
import { AuditLogPanel } from '@/components/admin/AuditLogPanel';
import { requireAdminSession } from '../adminGate';

export default async function AdminAuditPage() {
  await requireAdminSession();
  return (
    <div>
      <PageHeader
        title="Audit log"
        description="A record of every administrative action."
      />
      <AuditLogPanel />
    </div>
  );
}
