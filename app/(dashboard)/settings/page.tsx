import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { PageHeader } from '@/components/layout/PageHeader';
import { OpenAIKeyForm } from '@/components/settings/OpenAIKeyForm';

export default async function SettingsPage() {
  const session = await auth();
  const tenantId = session?.user?.tenantId;
  if (!tenantId) return null;

  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
    select: { openaiApiKey: true, openaiKeySetAt: true },
  });

  return (
    <div>
      <PageHeader
        title="Settings"
        description="Configure integrations and account preferences."
      />
      <div className="max-w-lg">
        <OpenAIKeyForm
          initialConfigured={!!tenant?.openaiApiKey}
          initialSetAt={tenant?.openaiKeySetAt?.toISOString() ?? null}
        />
      </div>
    </div>
  );
}
