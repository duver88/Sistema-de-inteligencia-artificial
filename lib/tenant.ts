import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';

export interface TenantContext {
  userId: string;
  // Empty string for super admins without a tenant (admin-type accounts are
  // created with tenantId null) — they never operate tenant features anyway.
  tenantId: string;
  role: string;
  isSuperAdmin: boolean;
  mustChangePassword?: boolean;
}

/**
 * Get the current user's tenant context from the session.
 * Returns null if the user is not authenticated or their account is not
 * ACTIVE (a suspended user is treated as unauthenticated). Non-admin users
 * additionally require a tenant; super admins may have none (tenantId '').
 */
export async function getCurrentTenant(): Promise<TenantContext | null> {
  const session = await auth();
  if (!session?.user?.id) return null;

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      id: true,
      tenantId: true,
      role: true,
      isSuperAdmin: true,
      status: true,
      mustChangePassword: true,
    },
  });

  if (!user) return null;
  if (user.status !== 'ACTIVE') return null;
  // Regular users must belong to a tenant; super admins are platform-only
  // accounts that may legitimately have no tenant (tenantId null). They still
  // need a context for role-agnostic routes (requireSuperAdmin, or
  // requireTenant({ allowSuperAdmin: true }) routes like /api/me/password
  // that only use userId).
  if (!user.tenantId && !user.isSuperAdmin) return null;

  return {
    userId: user.id,
    tenantId: user.tenantId ?? '',
    role: user.role,
    isSuperAdmin: user.isSuperAdmin,
    mustChangePassword: user.mustChangePassword,
  };
}

/**
 * Require an authenticated tenant context. Returns a 401 response if not authenticated.
 * Use in API route handlers: `const ctx = await requireTenant(); if (ctx instanceof NextResponse) return ctx;`
 *
 * Super admins are administrators ONLY — they never operate tenant features
 * (connect Facebook pages, run bots, reply to comments, change OpenAI
 * settings, ...), so by default they are rejected with 403 even when their
 * account still has a tenantId. Routes that are legitimately shared by every
 * signed-in user regardless of role (e.g. changing your own password) can
 * opt out with `{ allowSuperAdmin: true }`.
 */
export async function requireTenant(
  options?: { allowSuperAdmin?: boolean; allowMustChangePassword?: boolean }
): Promise<TenantContext | NextResponse> {
  const ctx = await getCurrentTenant();
  if (!ctx) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  if (ctx.isSuperAdmin && !options?.allowSuperAdmin) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  // A user provisioned with a temporary password must change it before using
  // any tenant feature — otherwise the forced rotation is only a UI gate the
  // dashboard layout enforces, bypassable by calling the API directly. The
  // password-change route itself opts out so the user can actually change it.
  if (ctx.mustChangePassword && !options?.allowMustChangePassword) {
    return NextResponse.json({ error: 'Password change required' }, { status: 403 });
  }
  return ctx;
}

/**
 * Require super-admin access.
 */
export async function requireSuperAdmin(): Promise<TenantContext | NextResponse> {
  const ctx = await getCurrentTenant();
  if (!ctx) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  if (!ctx.isSuperAdmin) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  return ctx;
}
