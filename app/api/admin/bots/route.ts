import { NextRequest, NextResponse } from 'next/server';
import { requireSuperAdmin } from '@/lib/tenant';
import { prisma } from '@/lib/prisma';
import type { Prisma } from '@/lib/generated/prisma/client';

const PAGE_SIZE = 20;

// GET /api/admin/bots — global view of bots across all tenants (super admin
// only). Paginated + filterable. Query: ?search= (bot, page or owner name)
// &tenantId= &page=. Contract E (paginated).
export async function GET(request: NextRequest) {
  const ctx = await requireSuperAdmin();
  if (ctx instanceof NextResponse) return ctx;

  const { searchParams } = new URL(request.url);
  const search = searchParams.get('search')?.trim() || undefined;
  const tenantId = searchParams.get('tenantId')?.trim() || undefined;
  const parsedPage = parseInt(searchParams.get('page') ?? '1', 10);
  const page = Number.isFinite(parsedPage) ? Math.max(1, parsedPage) : 1;

  const where: Prisma.BotWhereInput = {
    ...(tenantId ? { tenantId } : {}),
    ...(search
      ? {
          OR: [
            { name: { contains: search, mode: 'insensitive' } },
            { account: { pageName: { contains: search, mode: 'insensitive' } } },
            { tenant: { name: { contains: search, mode: 'insensitive' } } },
          ],
        }
      : {}),
  };

  const [total, bots] = await Promise.all([
    prisma.bot.count({ where }),
    prisma.bot.findMany({
      where,
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
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
  ]);

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
    total,
    page,
    totalPages: Math.max(1, Math.ceil(total / PAGE_SIZE)),
  });
}
