import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import type { Prisma } from '@/lib/generated/prisma/client';
import { redirect } from 'next/navigation';
import { PageHeader } from '@/components/layout/PageHeader';
import { CommentFilters } from '@/components/comments/CommentFilters';
import { CommentTable } from '@/components/comments/CommentTable';
import { Suspense } from 'react';

const PAGE_SIZE = 50;

export default async function CommentsPage({
  searchParams,
}: {
  searchParams: Promise<{ botId?: string; action?: string; platform?: string; search?: string; page?: string }>;
}) {
  const session = await auth();
  if (session?.user?.isSuperAdmin) redirect('/admin');
  const tenantId = session?.user?.tenantId;
  if (!tenantId) return null;

  const filters = await searchParams;
  // Guard against non-numeric ?page — parseInt('abc') is NaN and Math.max(1, NaN)
  // is NaN, which would reach Prisma's skip and throw.
  const parsedPage = parseInt(filters.page ?? '1', 10);
  const page = Number.isFinite(parsedPage) ? Math.max(1, parsedPage) : 1;

  // Only pass through valid enum values — an arbitrary ?action= / ?platform=
  // would make Prisma throw an enum validation error and 500 the page.
  const VALID_ACTIONS = ['REPLIED', 'DELETED', 'HIDDEN', 'IGNORED', 'MANUAL_REPLY', 'MANUAL_DELETE', 'REPLY_DELETED', 'ERROR'];
  const VALID_PLATFORMS = ['FACEBOOK', 'INSTAGRAM'];
  const action = filters.action && VALID_ACTIONS.includes(filters.action) ? filters.action : undefined;
  const platform = filters.platform && VALID_PLATFORMS.includes(filters.platform) ? filters.platform : undefined;

  // Filters the user actually picked, without the implicit hiding rule below.
  const baseWhere: Prisma.CommentLogWhereInput = {
    tenantId,
    ...(filters.botId ? { botId: filters.botId } : {}),
    ...(platform ? { platform: { equals: platform as 'FACEBOOK' | 'INSTAGRAM' } } : {}),
    ...(filters.search
      ? {
          OR: [
            { originalText: { contains: filters.search, mode: 'insensitive' as const } },
            { authorName: { contains: filters.search, mode: 'insensitive' as const } },
          ],
        }
      : {}),
  };

  // What the header counts. A comment the user deleted by hand was still
  // processed by the platform, so it keeps counting towards the total even
  // though it no longer shows up in the list.
  const countWhere: Prisma.CommentLogWhereInput = {
    ...baseWhere,
    ...(action
      ? { action: { equals: action as 'REPLIED' | 'DELETED' | 'HIDDEN' | 'IGNORED' | 'MANUAL_REPLY' | 'MANUAL_DELETE' | 'REPLY_DELETED' | 'ERROR' } }
      : {}),
  };

  // What the list shows. With no explicit action filter, comments the user
  // deleted by hand are hidden: once you delete a comment it disappears from
  // the working list. The row is NEVER removed from the database — it stays in
  // the audit trail and is still reachable by picking "Manual delete" in the
  // action filter. Comments the bot removed on its own (DELETED / HIDDEN) keep
  // showing.
  const where: Prisma.CommentLogWhereInput = {
    ...baseWhere,
    ...(action
      ? { action: { equals: action as 'REPLIED' | 'DELETED' | 'HIDDEN' | 'IGNORED' | 'MANUAL_REPLY' | 'MANUAL_DELETE' | 'REPLY_DELETED' | 'ERROR' } }
      : { action: { not: 'MANUAL_DELETE' as const } }),
  };

  const [total, listTotal, comments, bots] = await Promise.all([
    prisma.commentLog.count({ where: countWhere }),
    // Pagination must follow the LIST, not the header count — otherwise the
    // hidden rows would produce trailing empty pages.
    prisma.commentLog.count({ where }),
    prisma.commentLog.findMany({
      where,
      include: {
        bot: {
          select: {
            name: true,
            account: { select: { pageName: true, pictureUrl: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
    prisma.bot.findMany({
      where: { tenantId },
      select: { id: true, name: true },
      orderBy: { createdAt: 'asc' },
    }),
  ]);

  const totalPages = Math.ceil(listTotal / PAGE_SIZE);

  const serialized = comments.map(c => ({
    id: c.id,
    originalText: c.originalText,
    authorName: c.authorName,
    action: c.action as string,
    platform: c.platform as string,
    aiReply: c.aiReply,
    aiReplyId: c.aiReplyId,
    createdAt: c.createdAt.toISOString(),
    bot: c.bot,
  }));

  return (
    <div>
      <PageHeader
        title="Comment History"
        description={`${total.toLocaleString('en-US')} comments processed in total`}
      />
      <Suspense>
        <CommentFilters bots={bots} />
      </Suspense>
      <Suspense>
        <CommentTable
          initialComments={serialized}
          totalPages={totalPages}
          currentPage={page}
        />
      </Suspense>
    </div>
  );
}
