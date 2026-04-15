import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { PageHeader } from '@/components/layout/PageHeader';
import { BotCard } from '@/components/bots/BotCard';
import { Settings } from 'lucide-react';
import Link from 'next/link';

export default async function BotsPage() {
  const session = await auth();
  const tenantId = session?.user?.tenantId;
  if (!tenantId) return null;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const bots = await prisma.bot.findMany({
    where: { tenantId },
    include: {
      account: {
        select: { platform: true, pageName: true, pictureUrl: true },
      },
    },
    orderBy: { createdAt: 'asc' },
  });

  const botsWithStats = await Promise.all(
    bots.map(async (bot) => {
      const [commentsToday, repliesToday, deletedToday] = await Promise.all([
        prisma.commentLog.count({ where: { botId: bot.id, createdAt: { gte: today } } }),
        prisma.commentLog.count({ where: { botId: bot.id, action: 'REPLIED', createdAt: { gte: today } } }),
        prisma.commentLog.count({ where: { botId: bot.id, action: 'DELETED', createdAt: { gte: today } } }),
      ]);
      return {
        ...bot,
        account: {
          ...bot.account,
          pictureUrl: bot.account.pictureUrl,
        },
        stats: { commentsToday, repliesToday, deletedToday },
      };
    })
  );

  return (
    <div>
      <PageHeader
        title="Bots"
        description="Manage your AI comment bots for each connected account."
      />

      {botsWithStats.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20">
          <div className="h-14 w-14 bg-slate-100 rounded-xl flex items-center justify-center mb-4">
            <Settings className="h-7 w-7 text-slate-400" />
          </div>
          <h3 className="text-base font-semibold text-slate-900 mb-1">No bots yet</h3>
          <p className="text-sm text-slate-500 text-center max-w-xs mb-6">
            Connect a Facebook Page or Instagram account to automatically create a bot.
          </p>
          <Link
            href="/accounts"
            className="bg-indigo-600 text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-indigo-700 transition-colors"
          >
            Connect Account
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {botsWithStats.map(bot => (
            <BotCard key={bot.id} bot={bot} />
          ))}
        </div>
      )}
    </div>
  );
}
