import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import type { Prisma } from '@/lib/generated/prisma/client';
import { notFound, redirect } from 'next/navigation';
import { PageHeader } from '@/components/layout/PageHeader';
import { BotRepliesList } from '@/components/bots/BotRepliesList';
import Link from 'next/link';
import { ChevronLeft } from 'lucide-react';

const PAGE_SIZE = 50;

export default async function RepliesPage({
  params,
}: {
  params: Promise<{ botId: string }>;
}) {
  const session = await auth();
  if (session?.user?.isSuperAdmin) redirect('/admin');
  const tenantId = session?.user?.tenantId;
  if (!tenantId) return null;

  const { botId } = await params;

  const bot = await prisma.bot.findFirst({
    where: { id: botId, tenantId },
    select: { id: true, name: true },
  });

  if (!bot) notFound();

  const where: Prisma.CommentLogWhereInput = {
    tenantId,
    botId,
    action: { in: ['REPLIED', 'MANUAL_REPLY'] },
  };

  const [total, replies] = await Promise.all([
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
      take: PAGE_SIZE,
    }),
  ]);

  const serialized = replies.map(c => ({
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
      <div className="mb-1">
        <Link
          href={`/bots/${botId}`}
          className="inline-flex items-center gap-1 text-xs text-slate-500 hover:text-slate-700 transition-colors"
        >
          <ChevronLeft className="h-3.5 w-3.5" />
          Back to bot
        </Link>
      </div>
      <PageHeader
        title="Replies"
        description={`Replies posted by ${bot.name}`}
      />
      <BotRepliesList
        botId={botId}
        initialReplies={serialized}
        initialTotalPages={Math.max(1, Math.ceil(total / PAGE_SIZE))}
      />
    </div>
  );
}
