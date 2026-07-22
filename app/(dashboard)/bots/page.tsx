import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { redirect } from 'next/navigation';
import { PageHeader } from '@/components/layout/PageHeader';
import { BotCard } from '@/components/bots/BotCard';
import { Bot } from 'lucide-react';
import Link from 'next/link';

export default async function BotsPage() {
  const session = await auth();
  if (session?.user?.isSuperAdmin) redirect('/admin');
  const tenantId = session?.user?.tenantId;
  if (!tenantId) return null;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Only show bots whose account is still connected. Disconnecting a page
  // deactivates its bot but keeps it in the DB (so reconnecting restores the
  // config) — those bots must not appear here, matching the Accounts page.
  const bots = await prisma.bot.findMany({
    where: { tenantId, account: { isActive: true } },
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
        <div className="flex flex-col items-center justify-center py-24 bg-white border border-slate-200 rounded-2xl shadow-sm">
          <div className="h-16 w-16 bg-cyan-50 rounded-2xl flex items-center justify-center mb-5">
            <Bot className="h-8 w-8 text-cyan-500" />
          </div>
          <h3 className="text-base font-semibold text-slate-900 mb-2">No bots yet</h3>
          <p className="text-sm text-slate-500 text-center max-w-xs mb-7">
            Connect a Facebook page or Instagram account to automatically create a bot.
          </p>
          <Link
            href="/accounts"
            className="px-5 py-2.5 rounded-xl text-sm font-bold transition-all shadow-sm hover:shadow-md"
            style={{ background: 'linear-gradient(135deg, #00C4D4, #00E5FF)', color: '#0a1628' }}
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
