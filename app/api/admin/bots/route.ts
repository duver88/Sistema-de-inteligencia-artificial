import { NextResponse } from 'next/server';
import { requireSuperAdmin } from '@/lib/tenant';
import { prisma } from '@/lib/prisma';

// GET /api/admin/bots — global view of every bot across all tenants (super
// admin only). Includes the owning page/platform, tenant and comment count.
// Contract E.
export async function GET() {
  const ctx = await requireSuperAdmin();
  if (ctx instanceof NextResponse) return ctx;

  const bots = await prisma.bot.findMany({
    select: {
      id: true,
      name: true,
      isActive: true,
      aiModel: true,
      account: { select: { platform: true, pageName: true } },
      tenant: { select: { id: true, name: true } },
      _count: { select: { comments: true } },
    },
    orderBy: { createdAt: 'desc' },
  });

  return NextResponse.json({
    bots: bots.map((bot) => ({
      id: bot.id,
      name: bot.name,
      isActive: bot.isActive,
      aiModel: bot.aiModel,
      platform: bot.account.platform,
      pageName: bot.account.pageName,
      tenant: { id: bot.tenant.id, name: bot.tenant.name },
      commentCount: bot._count.comments,
    })),
  });
}
