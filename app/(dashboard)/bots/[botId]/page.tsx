import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { notFound } from 'next/navigation';
import { PageHeader } from '@/components/layout/PageHeader';
import { BotSettings } from '@/components/bots/BotSettings';
import Link from 'next/link';
import { BookOpen, Sliders, MessageSquare, ChevronRight } from 'lucide-react';

export default async function BotDetailPage({
  params,
}: {
  params: Promise<{ botId: string }>;
}) {
  const session = await auth();
  const tenantId = session?.user?.tenantId;
  if (!tenantId) return null;

  const { botId } = await params;

  const bot = await prisma.bot.findFirst({
    where: { id: botId, tenantId },
    include: {
      account: { select: { platform: true, pageName: true, pictureUrl: true } },
    },
  });

  if (!bot) notFound();

  const serialized = {
    ...bot,
    account: {
      ...bot.account,
      platform: bot.account.platform as string,
    },
    systemInstructions: bot.systemInstructions,
    deleteKeywords: bot.deleteKeywords as string[],
    spamKeywords: bot.spamKeywords as string[],
  };

  return (
    <div>
      <PageHeader
        title={bot.name}
        description={`Configuring bot for ${bot.account.pageName}`}
      />

      {/* Quick nav to sub-sections */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        <Link
          href={`/bots/${botId}/knowledge`}
          className="flex items-center justify-between bg-white border border-slate-200 rounded-2xl p-4 shadow-sm hover:shadow-md transition-all hover:-translate-y-0.5"
        >
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-cyan-50 flex items-center justify-center">
              <BookOpen className="h-4 w-4 text-cyan-600" />
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-900">Knowledge Base</p>
              <p className="text-xs text-slate-500">Manage facts and frequently asked questions</p>
            </div>
          </div>
          <ChevronRight className="h-4 w-4 text-slate-400" />
        </Link>

        <Link
          href={`/bots/${botId}/rules`}
          className="flex items-center justify-between bg-white border border-slate-200 rounded-2xl p-4 shadow-sm hover:shadow-md transition-all hover:-translate-y-0.5"
        >
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-red-50 flex items-center justify-center">
              <Sliders className="h-4 w-4 text-red-600" />
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-900">Moderation Rules</p>
              <p className="text-xs text-slate-500">Keyword patterns for deletion and spam</p>
            </div>
          </div>
          <ChevronRight className="h-4 w-4 text-slate-400" />
        </Link>

        <Link
          href={`/bots/${botId}/replies`}
          className="flex items-center justify-between bg-white border border-slate-200 rounded-2xl p-4 shadow-sm hover:shadow-md transition-all hover:-translate-y-0.5"
        >
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-emerald-50 flex items-center justify-center">
              <MessageSquare className="h-4 w-4 text-emerald-600" />
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-900">Replies</p>
              <p className="text-xs text-slate-500">Review and edit the bot&apos;s replies</p>
            </div>
          </div>
          <ChevronRight className="h-4 w-4 text-slate-400" />
        </Link>
      </div>

      <BotSettings bot={serialized} />
    </div>
  );
}
