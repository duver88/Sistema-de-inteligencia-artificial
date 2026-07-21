import { Plan } from '@/lib/generated/prisma/client';
import { prisma } from '@/lib/prisma';

export interface PlanLimits {
  /** Max connected SocialAccounts (pages). Infinity for unlimited plans. */
  maxPages: number;
  /** Max bots. Infinity for unlimited plans. */
  maxBots: number;
}

/**
 * Per-plan resource ceilings. ENTERPRISE uses Number.POSITIVE_INFINITY to mean
 * "unlimited". NOTE: Infinity does NOT survive JSON.stringify (it serializes to
 * `null`), so API responses must never send a raw Infinity. Use
 * `serializeLimit()` (returns null for unlimited) plus an explicit `unlimited`
 * flag from `isUnlimited()` when shaping JSON.
 */
export const PLAN_LIMITS: Record<Plan, PlanLimits> = {
  FREE: { maxPages: 1, maxBots: 1 },
  STARTER: { maxPages: 3, maxBots: 5 },
  PROFESSIONAL: { maxPages: 10, maxBots: 20 },
  ENTERPRISE: {
    maxPages: Number.POSITIVE_INFINITY,
    maxBots: Number.POSITIVE_INFINITY,
  },
};

export interface TenantUsage {
  pages: number;
  bots: number;
}

/** True when a limit value represents "no ceiling" (ENTERPRISE). */
export function isUnlimited(limit: number): boolean {
  return !Number.isFinite(limit);
}

/**
 * JSON-safe representation of a limit: `null` when unlimited (Infinity cannot
 * be represented in JSON), otherwise the finite number.
 */
export function serializeLimit(limit: number): number | null {
  return Number.isFinite(limit) ? limit : null;
}

/** Limits for a given plan (falls back to FREE for unknown values). */
export function getPlanLimits(plan: Plan): PlanLimits {
  return PLAN_LIMITS[plan] ?? PLAN_LIMITS.FREE;
}

/**
 * Current resource usage for a tenant: number of SocialAccounts (pages) and
 * Bots. Counts every row owned by the tenant regardless of active state — the
 * ceiling is on provisioned resources, not just enabled ones.
 */
export async function getTenantUsage(tenantId: string): Promise<TenantUsage> {
  const [pages, bots] = await Promise.all([
    prisma.socialAccount.count({ where: { tenantId } }),
    prisma.bot.count({ where: { tenantId } }),
  ]);
  return { pages, bots };
}

export interface PlanCheck {
  allowed: boolean;
  limit: number;
  current: number;
}

/**
 * Whether the tenant can add another page without exceeding its plan.
 * Pass `additionalPages` when checking a batch (defaults to 1). Unlimited
 * plans always allow.
 */
export async function canAddPage(
  tenantId: string,
  additionalPages = 1
): Promise<PlanCheck> {
  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
    select: { plan: true },
  });
  const limit = getPlanLimits(tenant?.plan ?? 'FREE').maxPages;
  const current = await prisma.socialAccount.count({ where: { tenantId } });
  return {
    allowed: isUnlimited(limit) || current + additionalPages <= limit,
    limit,
    current,
  };
}

/**
 * Whether the tenant can add another bot without exceeding its plan.
 * Unlimited plans always allow.
 */
export async function canAddBot(
  tenantId: string,
  additionalBots = 1
): Promise<PlanCheck> {
  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
    select: { plan: true },
  });
  const limit = getPlanLimits(tenant?.plan ?? 'FREE').maxBots;
  const current = await prisma.bot.count({ where: { tenantId } });
  return {
    allowed: isUnlimited(limit) || current + additionalBots <= limit,
    limit,
    current,
  };
}

/**
 * Assert a page can be added; throws PlanLimitError when the plan is exceeded.
 * Callers that prefer a boolean can use `canAddPage` directly.
 */
export async function assertCanAddPage(
  tenantId: string,
  additionalPages = 1
): Promise<void> {
  const check = await canAddPage(tenantId, additionalPages);
  if (!check.allowed) {
    throw new PlanLimitError('pages', check.current, check.limit);
  }
}

/**
 * Assert a bot can be added; throws PlanLimitError when the plan is exceeded.
 */
export async function assertCanAddBot(
  tenantId: string,
  additionalBots = 1
): Promise<void> {
  const check = await canAddBot(tenantId, additionalBots);
  if (!check.allowed) {
    throw new PlanLimitError('bots', check.current, check.limit);
  }
}

/** Thrown when a plan ceiling would be exceeded. */
export class PlanLimitError extends Error {
  constructor(
    public readonly resource: 'pages' | 'bots',
    public readonly current: number,
    public readonly limit: number
  ) {
    super(`Plan limit reached for ${resource} (${current}/${limit})`);
    this.name = 'PlanLimitError';
  }
}
