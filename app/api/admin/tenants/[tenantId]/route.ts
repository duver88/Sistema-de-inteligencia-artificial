import { NextRequest, NextResponse } from 'next/server';
import { requireSuperAdmin } from '@/lib/tenant';
import { prisma } from '@/lib/prisma';
import { Plan } from '@/lib/generated/prisma/client';
import { getPlanLimits, serializeLimit } from '@/lib/plans';
import { recordAudit, AUDIT_ACTIONS } from '@/lib/audit';

type Params = { params: Promise<{ tenantId: string }> };

const VALID_PLANS: Plan[] = ['FREE', 'STARTER', 'PROFESSIONAL', 'ENTERPRISE'];

// PATCH /api/admin/tenants/[tenantId] — change a tenant's plan (super admin
// only). Body { plan } validated against the Plan enum. Records a
// 'plan.update' audit entry with the old/new plan. Contract C.
export async function PATCH(request: NextRequest, { params }: Params) {
  const ctx = await requireSuperAdmin();
  if (ctx instanceof NextResponse) return ctx;

  const { tenantId } = await params;

  const body = (await request.json().catch(() => null)) as { plan?: unknown } | null;
  const plan = body?.plan;

  if (typeof plan !== 'string' || !VALID_PLANS.includes(plan as Plan)) {
    return NextResponse.json({ error: 'Invalid plan' }, { status: 400 });
  }

  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
    select: { id: true, plan: true },
  });
  if (!tenant) {
    return NextResponse.json({ error: 'Tenant not found' }, { status: 404 });
  }

  const previousPlan = tenant.plan;
  const nextPlan = plan as Plan;

  const updated = await prisma.tenant.update({
    where: { id: tenantId },
    data: { plan: nextPlan },
    select: {
      id: true,
      name: true,
      plan: true,
      _count: {
        // Only Facebook Pages count against the plan (see lib/plans.ts).
        select: {
          accounts: { where: { platform: 'FACEBOOK' } },
          bots: true,
          users: true,
        },
      },
    },
  });

  // Only audit an actual change; getCurrentTenant() does not carry the actor
  // email, so look it up locally for the audit snapshot.
  if (previousPlan !== nextPlan) {
    const actor = await prisma.user.findUnique({
      where: { id: ctx.userId },
      select: { email: true },
    });
    await recordAudit({
      actorId: ctx.userId,
      actorEmail: actor?.email ?? '',
      action: AUDIT_ACTIONS.PLAN_UPDATE,
      targetType: 'tenant',
      targetId: tenantId,
      metadata: { from: previousPlan, to: nextPlan },
    });
  }

  const limits = getPlanLimits(updated.plan);
  return NextResponse.json({
    tenant: {
      id: updated.id,
      name: updated.name,
      plan: updated.plan,
      usage: { pages: updated._count.accounts, bots: updated._count.bots },
      limits: {
        maxPages: serializeLimit(limits.maxPages),
        maxBots: serializeLimit(limits.maxBots),
      },
      userCount: updated._count.users,
    },
  });
}
