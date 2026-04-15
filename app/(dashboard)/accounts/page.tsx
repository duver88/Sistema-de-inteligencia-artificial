import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { PageHeader } from '@/components/layout/PageHeader';
import { AccountsClient } from './AccountsClient';

export default async function AccountsPage() {
  const session = await auth();
  const tenantId = session?.user?.tenantId;
  if (!tenantId) return null;

  const accounts = await prisma.socialAccount.findMany({
    where: { tenantId, isActive: true },
    orderBy: { connectedAt: 'desc' },
  });

  const serialized = accounts.map(a => ({
    ...a,
    connectedAt: a.connectedAt.toISOString(),
    tokenExpiresAt: a.tokenExpiresAt?.toISOString() ?? null,
  }));

  return (
    <div>
      <AccountsClient initialAccounts={serialized} />
    </div>
  );
}
