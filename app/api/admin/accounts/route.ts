import { NextResponse } from 'next/server';
import { requireSuperAdmin } from '@/lib/tenant';
import { prisma } from '@/lib/prisma';

// GET /api/admin/accounts — global view of every connected page across all
// tenants (super admin only), newest first. Never exposes pageToken. Contract D.
export async function GET() {
  const ctx = await requireSuperAdmin();
  if (ctx instanceof NextResponse) return ctx;

  const accounts = await prisma.socialAccount.findMany({
    select: {
      id: true,
      platform: true,
      pageName: true,
      pictureUrl: true,
      isActive: true,
      webhookSubscribed: true,
      connectedAt: true,
      tenant: { select: { id: true, name: true } },
    },
    orderBy: { connectedAt: 'desc' },
  });

  return NextResponse.json({
    accounts: accounts.map((account) => ({
      id: account.id,
      platform: account.platform,
      pageName: account.pageName,
      pictureUrl: account.pictureUrl,
      isActive: account.isActive,
      webhookSubscribed: account.webhookSubscribed,
      connectedAt: account.connectedAt,
      tenant: { id: account.tenant.id, name: account.tenant.name },
    })),
  });
}
