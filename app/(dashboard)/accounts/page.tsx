import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { redirect } from 'next/navigation';
import { PageHeader } from '@/components/layout/PageHeader';
import { AccountsClient } from './AccountsClient';

export default async function AccountsPage() {
  const session = await auth();
  if (session?.user?.isSuperAdmin) redirect('/admin');
  const tenantId = session?.user?.tenantId;
  if (!tenantId) return null;

  // Explicit select — never embed the encrypted pageToken in the RSC payload
  const accounts = await prisma.socialAccount.findMany({
    where: { tenantId, isActive: true },
    select: {
      id: true,
      platform: true,
      pageName: true,
      pageId: true,
      pictureUrl: true,
      connectedAt: true,
      tokenExpiresAt: true,
      isActive: true,
      webhookSubscribed: true,
    },
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
