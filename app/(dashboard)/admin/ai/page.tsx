import { PageHeader } from '@/components/layout/PageHeader';
import { OpenAiKeyCard } from '@/components/admin/OpenAiKeyCard';
import { UsagePanel } from '@/components/admin/UsagePanel';
import { requireAdminSession } from '../adminGate';

export default async function AdminAiPage() {
  await requireAdminSession();
  return (
    <div>
      <PageHeader
        title="AI & Usage"
        description="Platform-wide OpenAI API key and token usage."
      />
      <div className="space-y-6">
        <OpenAiKeyCard />
        <UsagePanel />
      </div>
    </div>
  );
}
