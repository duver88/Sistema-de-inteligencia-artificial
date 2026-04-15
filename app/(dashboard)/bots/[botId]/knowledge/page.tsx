import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { notFound } from 'next/navigation';
import { PageHeader } from '@/components/layout/PageHeader';
import { KnowledgeBaseEditor } from '@/components/bots/KnowledgeBaseEditor';
import Link from 'next/link';
import { ChevronLeft } from 'lucide-react';

export default async function KnowledgePage({
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
    select: { id: true, name: true },
  });

  if (!bot) notFound();

  const entries = await prisma.knowledgeEntry.findMany({
    where: { botId },
    include: { project: { select: { name: true } } },
    orderBy: { createdAt: 'asc' },
  });

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
        title="Base de Conocimiento"
        description={`Hechos y preguntas frecuentes para ${bot.name}`}
      />
      <KnowledgeBaseEditor
        botId={botId}
        initialEntries={entries}
      />
    </div>
  );
}
