import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';

export interface TenantContext {
  userId: string;
  tenantId: string;
  role: string;
  isSuperAdmin: boolean;
}

/**
 * Get the current user's tenant context from the session.
 * Returns null if the user is not authenticated.
 */
export async function getCurrentTenant(): Promise<TenantContext | null> {
  const session = await auth();
  if (!session?.user?.id) return null;

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { id: true, tenantId: true, role: true, isSuperAdmin: true },
  });

  if (!user) return null;

  return {
    userId: user.id,
    tenantId: user.tenantId,
    role: user.role,
    isSuperAdmin: user.isSuperAdmin,
  };
}

/**
 * Require an authenticated tenant context. Returns a 401 response if not authenticated.
 * Use in API route handlers: `const ctx = await requireTenant(); if (ctx instanceof NextResponse) return ctx;`
 */
export async function requireTenant(): Promise<TenantContext | NextResponse> {
  const ctx = await getCurrentTenant();
  if (!ctx) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
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
