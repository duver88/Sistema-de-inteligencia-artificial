import { NextRequest, NextResponse } from 'next/server';
import { requireSuperAdmin } from '@/lib/tenant';
import { prisma } from '@/lib/prisma';
import { getPlanLimits, serializeLimit } from '@/lib/plans';
import type { Prisma } from '@/lib/generated/prisma/client';

const PAGE_SIZE = 20;

// GET /api/admin/tenants — list tenants (workspaces) with plan, usage, limits
// and user count (super admin only). Paginated + searchable by name so it
// scales to many workspaces. Query: ?search= &page=. Contract C (paginated).
export async function GET(request: NextRequest) {
  const ctx = await requireSuperAdmin();
  if (ctx instanceof NextResponse) return ctx;

  const { searchParams } = new URL(request.url);
  const search = searchParams.get('search')?.trim() || undefined;
  const parsedPage = parseInt(searchParams.get('page') ?? '1', 10);
  const page = Number.isFinite(parsedPage) ? Math.max(1, parsedPage) : 1;

  const where: Prisma.TenantWhereInput = search
    ? { name: { contains: search, mode: 'insensitive' } }
    : {};

  const [total, tenants] = await Promise.all([
    prisma.tenant.count({ where }),
    prisma.tenant.findMany({
      where,
      select: {
        id: true,
        name: true,
        plan: true,
        _count: { select: { accounts: true, bots: true, users: true } },
      },
      orderBy: { createdAt: 'asc' },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
  ]);

  return NextResponse.json({
    tenants: tenants.map((tenant) => {
      const limits = getPlanLimits(tenant.plan);
      return {
        id: tenant.id,
        name: tenant.name,
        plan: tenant.plan,
        usage: { pages: tenant._count.accounts, bots: tenant._count.bots },
        limits: {
          maxPages: serializeLimit(limits.maxPages),
          maxBots: serializeLimit(limits.maxBots),
        },
        userCount: tenant._count.users,
      };
    }),
    total,
    page,
    totalPages: Math.max(1, Math.ceil(total / PAGE_SIZE)),
  });
}
