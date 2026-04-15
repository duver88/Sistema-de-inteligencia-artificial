import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import type { Prisma } from '@/lib/generated/prisma/client';
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
  const tenantId = session?.user?.tenantId;
  if (!tenantId) return null;

  const filters = await searchParams;
  const page = Math.max(1, parseInt(filters.page ?? '1', 10));

  const where: Prisma.CommentLogWhereInput = {
    tenantId,
    ...(filters.botId ? { botId: filters.botId } : {}),
    ...(filters.action ? { action: { equals: filters.action as 'REPLIED' | 'DELETED' | 'HIDDEN' | 'IGNORED' | 'MANUAL_REPLY' | 'MANUAL_DELETE' | 'ERROR' } } : {}),
    ...(filters.platform ? { platform: { equals: filters.platform as 'FACEBOOK' | 'INSTAGRAM' } } : {}),
    ...(filters.search
      ? {
          OR: [
            { originalText: { contains: filters.search, mode: 'insensitive' as const } },
            { authorName: { contains: filters.search, mode: 'insensitive' as const } },
          ],
        }
      : {}),
  };

  const [total, comments, bots] = await Promise.all([
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

  const totalPages = Math.ceil(total / PAGE_SIZE);

  const serialized = comments.map(c => ({
    id: c.id,
    originalText: c.originalText,
    authorName: c.authorName,
    action: c.action as string,
    platform: c.platform as string,
    aiReply: c.aiReply,
    createdAt: c.createdAt.toISOString(),
    bot: c.bot,
  }));

  return (
    <div>
      <PageHeader
        title="Comment History"
        description={`${total.toLocaleString()} total comments processed`}
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
