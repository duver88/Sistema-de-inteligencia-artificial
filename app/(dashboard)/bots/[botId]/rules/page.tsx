import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { notFound } from 'next/navigation';
import { PageHeader } from '@/components/layout/PageHeader';
import { ModerationRulesEditor } from '@/components/bots/ModerationRulesEditor';
import Link from 'next/link';
import { ChevronLeft } from 'lucide-react';

export default async function RulesPage({
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
    select: {
      id: true,
      name: true,
      deleteKeywords: true,
      spamKeywords: true,
    },
  });

  if (!bot) notFound();

  return (
    <div>
      <div className="mb-1">
        <Link
          href={`/bots/${botId}`}
          className="inline-flex items-center gap-1 text-xs text-slate-500 hover:text-slate-700 transition-colors"
        >
          <ChevronLeft className="h-3.5 w-3.5" />
          Volver al bot
        </Link>
      </div>
      <PageHeader
        title="Reglas de Moderación"
        description={`Patrones de palabras clave para eliminar y spam en ${bot.name}`}
      />
      <ModerationRulesEditor
        botId={botId}
        initialDeleteKeywords={bot.deleteKeywords as string[]}
        initialSpamKeywords={bot.spamKeywords as string[]}
      />
    </div>
  );
}
