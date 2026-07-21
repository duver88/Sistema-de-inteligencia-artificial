import { NextRequest, NextResponse } from 'next/server';
import { requireSuperAdmin } from '@/lib/tenant';
import { prisma } from '@/lib/prisma';
import { CommentAction, Prisma } from '@/lib/generated/prisma/client';

const PAGE_SIZE = 50;

const VALID_ACTIONS: CommentAction[] = [
  'REPLIED',
  'DELETED',
  'HIDDEN',
  'IGNORED',
  'MANUAL_REPLY',
  'MANUAL_DELETE',
  'ERROR',
];

// GET /api/admin/comments?action=&tenantId=&page= — global moderation feed
// across all tenants (super admin only), newest first, 50 per page. Optional
// filters by CommentAction and tenant. Never exposes page tokens or other
// sensitive fields. Contract F.
export async function GET(request: NextRequest) {
  const ctx = await requireSuperAdmin();
  if (ctx instanceof NextResponse) return ctx;

  const { searchParams } = new URL(request.url);

  // Validate optional action filter against the enum
  const actionParam = searchParams.get('action');
  let action: CommentAction | undefined;
  if (actionParam) {
    if (!VALID_ACTIONS.includes(actionParam as CommentAction)) {
      return NextResponse.json({ error: 'Invalid action filter' }, { status: 400 });
    }
    action = actionParam as CommentAction;
  }

  // Optional tenant filter (plain string id; unknown ids simply yield 0 rows)
  const tenantIdParam = searchParams.get('tenantId');
  const tenantId = tenantIdParam ? tenantIdParam : undefined;

  // Safe numeric page (>= 1)
  const pageParam = Number.parseInt(searchParams.get('page') ?? '1', 10);
  const page = Number.isFinite(pageParam) && pageParam > 0 ? pageParam : 1;

  const where: Prisma.CommentLogWhereInput = {};
  if (action) where.action = action;
  if (tenantId) where.tenantId = tenantId;

  const [total, comments] = await Promise.all([
    prisma.commentLog.count({ where }),
    prisma.commentLog.findMany({
      where,
      select: {
        id: true,
        createdAt: true,
        platform: true,
        authorName: true,
        originalText: true,
        action: true,
        aiReply: true,
        bot: { select: { account: { select: { pageName: true } } } },
        tenant: { select: { name: true } },
      },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
  ]);

  return NextResponse.json({
    comments: comments.map((comment) => ({
      id: comment.id,
      createdAt: comment.createdAt,
      platform: comment.platform,
      authorName: comment.authorName,
      originalText: comment.originalText,
      action: comment.action,
      aiReply: comment.aiReply,
      pageName: comment.bot.account.pageName,
      tenantName: comment.tenant.name,
    })),
    total,
    page,
    totalPages: Math.max(1, Math.ceil(total / PAGE_SIZE)),
  });
}
