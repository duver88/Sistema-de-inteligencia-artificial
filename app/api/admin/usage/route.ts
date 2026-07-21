import { NextRequest, NextResponse } from 'next/server';
import { requireSuperAdmin } from '@/lib/tenant';
import { prisma } from '@/lib/prisma';

const DEFAULT_DAYS = 30;
const MAX_DAYS = 365;

// GET /api/admin/usage?days=30 — aggregated AI usage for the last N days (super admin only)
export async function GET(request: NextRequest) {
  const ctx = await requireSuperAdmin();
  if (ctx instanceof NextResponse) return ctx;

  const daysParam = Number(request.nextUrl.searchParams.get('days') ?? DEFAULT_DAYS);
  const days = Number.isFinite(daysParam)
    ? Math.min(Math.max(Math.trunc(daysParam), 1), MAX_DAYS)
    : DEFAULT_DAYS;

  // Range start: UTC midnight, (days - 1) days ago — so days=1 means "today"
  const now = new Date();
  const since = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - (days - 1))
  );

  const rows = await prisma.aiUsage.findMany({
    where: { day: { gte: since } },
    select: {
      tenantId: true,
      day: true,
      calls: true,
      promptTokens: true,
      completionTokens: true,
      tenant: { select: { name: true } },
    },
    orderBy: { day: 'asc' },
  });

  const totals = { calls: 0, promptTokens: 0, completionTokens: 0 };
  const tenantMap = new Map<
    string,
    { tenantId: string; tenantName: string; calls: number; promptTokens: number; completionTokens: number }
  >();
  const dayMap = new Map<string, { day: string; calls: number; totalTokens: number }>();

  for (const row of rows) {
    totals.calls += row.calls;
    totals.promptTokens += row.promptTokens;
    totals.completionTokens += row.completionTokens;

    const byTenant = tenantMap.get(row.tenantId) ?? {
      tenantId: row.tenantId,
      tenantName: row.tenant.name,
      calls: 0,
      promptTokens: 0,
      completionTokens: 0,
    };
    byTenant.calls += row.calls;
    byTenant.promptTokens += row.promptTokens;
    byTenant.completionTokens += row.completionTokens;
    tenantMap.set(row.tenantId, byTenant);

    const dayKey = row.day.toISOString().slice(0, 10);
    const byDay = dayMap.get(dayKey) ?? { day: dayKey, calls: 0, totalTokens: 0 };
    byDay.calls += row.calls;
    byDay.totalTokens += row.promptTokens + row.completionTokens;
    dayMap.set(dayKey, byDay);
  }

  const byTenant = [...tenantMap.values()].sort(
    (a, b) =>
      b.promptTokens + b.completionTokens - (a.promptTokens + a.completionTokens)
  );
  const byDay = [...dayMap.values()].sort((a, b) => a.day.localeCompare(b.day));

  return NextResponse.json({ totals, byTenant, byDay });
}
