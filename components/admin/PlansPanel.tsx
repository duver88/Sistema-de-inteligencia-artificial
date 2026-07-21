'use client';

import { useCallback, useEffect, useState } from 'react';
import { CreditCard, Loader2, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

const PLANS = ['FREE', 'STARTER', 'PROFESSIONAL', 'ENTERPRISE'] as const;
type Plan = (typeof PLANS)[number];

interface PlanLimits {
  // Finite number, or null when unlimited (Infinity is not JSON-representable).
  maxPages: number | null;
  maxBots: number | null;
}

interface TenantRow {
  id: string;
  name: string;
  plan: Plan;
  usage: { pages: number; bots: number };
  limits: PlanLimits;
  userCount: number;
}

const PLAN_LABELS: Record<Plan, string> = {
  FREE: 'Free',
  STARTER: 'Starter',
  PROFESSIONAL: 'Professional',
  ENTERPRISE: 'Enterprise',
};

const PLAN_BADGE: Record<Plan, string> = {
  FREE: 'bg-slate-100 text-slate-600 border-slate-200',
  STARTER: 'bg-sky-50 text-sky-700 border-sky-200',
  PROFESSIONAL: 'bg-violet-50 text-violet-700 border-violet-200',
  ENTERPRISE: 'bg-amber-50 text-amber-700 border-amber-200',
};

interface PendingChange {
  tenant: TenantRow;
  nextPlan: Plan;
}

function isUnlimited(limit: number | null): boolean {
  return limit === null || !Number.isFinite(limit);
}

function limitLabel(limit: number | null): string {
  return isUnlimited(limit) ? 'Unlimited' : String(limit);
}

/** Renders "current / limit" with a usage bar; bar is muted for unlimited. */
function UsageMeter({ current, limit }: { current: number; limit: number | null }) {
  const unlimited = isUnlimited(limit);
  const ratio = unlimited || !limit ? 0 : Math.min(1, current / limit);
  const over = !unlimited && limit !== null && current > limit;
  const barColor = over ? 'bg-red-500' : ratio >= 0.85 ? 'bg-amber-500' : 'bg-cyan-500';

  return (
    <div className="min-w-[120px]">
      <div className="flex items-baseline justify-between gap-2 mb-1">
        <span className={`text-sm font-medium ${over ? 'text-red-600' : 'text-slate-800'}`}>
          {current}
          <span className="text-slate-400"> / {limitLabel(limit)}</span>
        </span>
      </div>
      <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
        {unlimited ? (
          <div className="h-full w-full bg-slate-200" />
        ) : (
          <div
            className={`h-full rounded-full transition-all ${barColor}`}
            style={{ width: `${Math.max(ratio * 100, current > 0 ? 6 : 0)}%` }}
          />
        )}
      </div>
    </div>
  );
}

export function PlansPanel() {
  const [tenants, setTenants] = useState<TenantRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState<PendingChange | null>(null);
  const [saving, setSaving] = useState(false);
  const [savingId, setSavingId] = useState<string | null>(null);

  const fetchTenants = useCallback(async () => {
    setError(null);
    setLoading(true);
    try {
      const res = await fetch('/api/admin/tenants', { cache: 'no-store' });
      if (!res.ok) throw new Error();
      const data = (await res.json()) as { tenants?: TenantRow[] };
      setTenants(Array.isArray(data.tenants) ? data.tenants : []);
    } catch {
      setError('Failed to load tenants. Please try again.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchTenants();
  }, [fetchTenants]);

  function requestChange(tenant: TenantRow, nextPlan: Plan) {
    if (nextPlan === tenant.plan) return;
    setPending({ tenant, nextPlan });
  }

  async function confirmChange() {
    if (!pending || saving) return;
    const { tenant, nextPlan } = pending;
    setSaving(true);
    setSavingId(tenant.id);
    try {
      const res = await fetch(`/api/admin/tenants/${tenant.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan: nextPlan }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(data.error ?? 'Failed to update plan');
        return;
      }
      toast.success(`${tenant.name} moved to ${PLAN_LABELS[nextPlan]}`);
      setPending(null);
      // Refresh so usage-vs-limit reflects the new plan's ceilings.
      await fetchTenants();
    } catch {
      toast.error('Failed to update plan');
    } finally {
      setSaving(false);
      setSavingId(null);
    }
  }

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
      {/* Header */}
      <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-slate-100 flex items-center justify-center flex-shrink-0">
            <CreditCard className="h-5 w-5 text-slate-500" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-slate-900">Plans &amp; Limits</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Manage each tenant&apos;s subscription plan and resource usage.
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => void fetchTenants()}
          disabled={loading}
          className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      <div className="p-6">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-16">
            <Loader2 className="h-6 w-6 text-slate-400 animate-spin mb-3" />
            <p className="text-sm text-slate-500">Loading tenants…</p>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center py-16">
            <p className="text-sm font-semibold text-slate-900 mb-1">Something went wrong</p>
            <p className="text-xs text-slate-500 mb-4">{error}</p>
            <button
              type="button"
              onClick={() => void fetchTenants()}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-slate-600 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              Retry
            </button>
          </div>
        ) : tenants.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 border border-dashed border-slate-200 rounded-xl">
            <CreditCard className="h-6 w-6 text-slate-300 mb-2" />
            <p className="text-sm font-semibold text-slate-700 mb-0.5">No tenants yet</p>
            <p className="text-xs text-slate-400">Tenants will appear here once they sign up.</p>
          </div>
        ) : (
          <div className="border border-slate-200 rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50">
                    <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">
                      Tenant
                    </th>
                    <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">
                      Users
                    </th>
                    <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">
                      Pages
                    </th>
                    <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">
                      Bots
                    </th>
                    <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">
                      Plan
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {tenants.map((tenant) => (
                    <tr
                      key={tenant.id}
                      className="border-b border-slate-100 last:border-0 hover:bg-slate-50/80 transition-colors"
                    >
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-2.5">
                          <span
                            className={`inline-flex items-center rounded-md border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${PLAN_BADGE[tenant.plan]}`}
                          >
                            {PLAN_LABELS[tenant.plan]}
                          </span>
                          <span className="text-sm font-medium text-slate-800 truncate max-w-[200px]">
                            {tenant.name}
                          </span>
                        </div>
                      </td>
                      <td className="px-5 py-3.5 text-slate-600">{tenant.userCount}</td>
                      <td className="px-5 py-3.5">
                        <UsageMeter current={tenant.usage.pages} limit={tenant.limits.maxPages} />
                      </td>
                      <td className="px-5 py-3.5">
                        <UsageMeter current={tenant.usage.bots} limit={tenant.limits.maxBots} />
                      </td>
                      <td className="px-5 py-3.5">
                        <div className="relative inline-flex items-center">
                          <select
                            value={tenant.plan}
                            disabled={savingId === tenant.id}
                            onChange={(e) => requestChange(tenant, e.target.value as Plan)}
                            className="appearance-none pl-3 pr-8 py-1.5 text-sm font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:border-slate-300 focus:outline-none focus:ring-2 focus:ring-cyan-400/40 focus:border-cyan-400 transition-colors disabled:opacity-50 cursor-pointer"
                          >
                            {PLANS.map((p) => (
                              <option key={p} value={p}>
                                {PLAN_LABELS[p]}
                              </option>
                            ))}
                          </select>
                          {savingId === tenant.id && (
                            <Loader2 className="absolute right-2.5 h-3.5 w-3.5 text-slate-400 animate-spin pointer-events-none" />
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Confirmation for a plan change */}
      <AlertDialog
        open={!!pending}
        onOpenChange={(open) => {
          if (!open && !saving) setPending(null);
        }}
      >
        <AlertDialogContent className="bg-white">
          <AlertDialogHeader>
            <AlertDialogTitle>
              Change plan for {pending?.tenant.name}?
            </AlertDialogTitle>
            <AlertDialogDescription>
              {pending ? (
                <>
                  This moves the tenant from{' '}
                  <span className="font-semibold text-slate-700">
                    {PLAN_LABELS[pending.tenant.plan]}
                  </span>{' '}
                  to{' '}
                  <span className="font-semibold text-slate-700">
                    {PLAN_LABELS[pending.nextPlan]}
                  </span>
                  , which updates their page and bot limits immediately. Existing
                  resources over the new limit are kept, but no new ones can be
                  added until usage is back within range.
                </>
              ) : null}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={saving}>Cancel</AlertDialogCancel>
            <button
              type="button"
              onClick={() => void confirmChange()}
              disabled={saving}
              className="inline-flex items-center justify-center gap-1.5 px-4 py-2 text-sm font-medium text-white rounded-lg transition-colors disabled:opacity-50"
              style={{ background: 'linear-gradient(135deg, #00C4D4, #00E5FF)', color: '#0a1628' }}
            >
              {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
              Confirm change
            </button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
