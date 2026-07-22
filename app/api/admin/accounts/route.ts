import { NextRequest, NextResponse } from 'next/server';
import { requireSuperAdmin } from '@/lib/tenant';
import { prisma } from '@/lib/prisma';
import type { Prisma } from '@/lib/generated/prisma/client';

const PAGE_SIZE = 20;

// GET /api/admin/accounts — global view of connected pages across all tenants
// (super admin only), newest first. Paginated + filterable so it never loads
// every page at once. Query: ?search= (page or owner name) &tenantId= &page=
// Never exposes pageToken. Contract D (paginated).
export async function GET(request: NextRequest) {
  const ctx = await requireSuperAdmin();
  if (ctx instanceof NextResponse) return ctx;

  const { searchParams } = new URL(request.url);
  const search = searchParams.get('search')?.trim() || undefined;
  const tenantId = searchParams.get('tenantId')?.trim() || undefined;
  const parsedPage = parseInt(searchParams.get('page') ?? '1', 10);
  const page = Number.isFinite(parsedPage) ? Math.max(1, parsedPage) : 1;

  const where: Prisma.SocialAccountWhereInput = {
    ...(tenantId ? { tenantId } : {}),
    ...(search
      ? {
          OR: [
            { pageName: { contains: search, mode: 'insensitive' } },
            { tenant: { name: { contains: search, mode: 'insensitive' } } },
          ],
        }
      : {}),
  };

  const [total, accounts] = await Promise.all([
    prisma.socialAccount.count({ where }),
    prisma.socialAccount.findMany({
      where,
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
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
  ]);

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
    total,
    page,
    totalPages: Math.max(1, Math.ceil(total / PAGE_SIZE)),
  });
}
