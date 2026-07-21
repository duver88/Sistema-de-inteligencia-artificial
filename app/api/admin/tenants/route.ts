import { NextResponse } from 'next/server';
import { requireSuperAdmin } from '@/lib/tenant';
import { prisma } from '@/lib/prisma';
import { getPlanLimits, serializeLimit } from '@/lib/plans';

// GET /api/admin/tenants — list every tenant with its plan, resource usage,
// plan limits and user count (super admin only). Contract C.
// Limits serialize Infinity (ENTERPRISE) to null so they survive JSON.
export async function GET() {
  const ctx = await requireSuperAdmin();
  if (ctx instanceof NextResponse) return ctx;

  const tenants = await prisma.tenant.findMany({
    select: {
      id: true,
      name: true,
      plan: true,
      _count: { select: { accounts: true, bots: true, users: true } },
    },
    orderBy: { createdAt: 'asc' },
  });

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
  });
}
