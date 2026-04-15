import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { notFound } from 'next/navigation';
import { PageHeader } from '@/components/layout/PageHeader';
import { BotSettings } from '@/components/bots/BotSettings';
import Link from 'next/link';
import { BookOpen, Sliders, ChevronRight } from 'lucide-react';

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
        description={`Configurando bot para ${bot.account.pageName}`}
      />

      {/* Quick nav to sub-sections */}
      <div className="grid grid-cols-2 gap-3 mb-6">
        <Link
          href={`/bots/${botId}/knowledge`}
          className="flex items-center justify-between bg-white border border-slate-200 rounded-2xl p-4 shadow-sm hover:shadow-md transition-all hover:-translate-y-0.5"
        >
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-cyan-50 flex items-center justify-center">
              <BookOpen className="h-4 w-4 text-cyan-600" />
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-900">Base de Conocimiento</p>
              <p className="text-xs text-slate-500">Gestionar hechos y preguntas frecuentes</p>
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
              <p className="text-sm font-semibold text-slate-900">Reglas de Moderación</p>
              <p className="text-xs text-slate-500">Patrones de palabras clave para eliminar y spam</p>
            </div>
          </div>
          <ChevronRight className="h-4 w-4 text-slate-400" />
        </Link>
      </div>

      <BotSettings bot={serialized} />
    </div>
  );
}
