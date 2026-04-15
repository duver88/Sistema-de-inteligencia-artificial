import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { PageHeader } from '@/components/layout/PageHeader';
import { MessageSquare, Settings, TrendingUp, Zap } from 'lucide-react';
import Link from 'next/link';

export default async function OverviewPage() {
  const session = await auth();
  const tenantId = session?.user?.tenantId;

  if (!tenantId) return null;

  // Fetch summary stats
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const [
    totalBots,
    activeBots,
    commentsToday,
    repliesToday,
    deletedToday,
    totalComments,
  ] = await Promise.all([
    prisma.bot.count({ where: { tenantId } }),
    prisma.bot.count({ where: { tenantId, isActive: true } }),
    prisma.commentLog.count({ where: { tenantId, createdAt: { gte: today } } }),
    prisma.commentLog.count({
      where: { tenantId, action: 'REPLIED', createdAt: { gte: today } },
    }),
    prisma.commentLog.count({
      where: { tenantId, action: 'DELETED', createdAt: { gte: today } },
    }),
    prisma.commentLog.count({ where: { tenantId } }),
  ]);

  const stats = [
    {
      label: 'Bots Activos',
      value: `${activeBots} / ${totalBots}`,
      icon: Settings,
      color: 'text-indigo-600',
      bg: 'bg-indigo-50',
      border: 'border-indigo-100',
    },
    {
      label: 'Comentarios Hoy',
      value: commentsToday.toString(),
      icon: MessageSquare,
      color: 'text-slate-600',
      bg: 'bg-slate-100',
      border: 'border-slate-200',
    },
    {
      label: 'Respondidos Hoy',
      value: repliesToday.toString(),
      icon: Zap,
      color: 'text-emerald-600',
      bg: 'bg-emerald-50',
      border: 'border-emerald-100',
    },
    {
      label: 'Eliminados Hoy',
      value: deletedToday.toString(),
      icon: TrendingUp,
      color: 'text-red-600',
      bg: 'bg-red-50',
      border: 'border-red-100',
    },
  ];

  return (
    <div>
      <PageHeader
        title={`Bienvenido, ${session?.user?.name?.split(' ')[0] ?? 'usuario'}`}
        description="Esto es lo que está pasando con tus bots de comentarios hoy."
      />

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {stats.map(stat => (
          <div
            key={stat.label}
            className={`bg-white border ${stat.border} rounded-2xl p-5 shadow-sm hover:shadow-md transition-shadow`}
          >
            <div className="flex items-center justify-between mb-4">
              <span className="text-xs font-medium text-slate-500 uppercase tracking-wide">{stat.label}</span>
              <div className={`h-9 w-9 rounded-xl ${stat.bg} flex items-center justify-center`}>
                <stat.icon className={`h-4 w-4 ${stat.color}`} />
              </div>
            </div>
            <p className="text-3xl font-bold text-slate-900">{stat.value}</p>
          </div>
        ))}
      </div>

      {/* Quick Actions */}
      <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-3">Acciones rápidas</h2>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Link
          href="/accounts"
          className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm hover:shadow-md transition-all hover:-translate-y-0.5 flex items-center gap-4 group"
        >
          <div className="h-11 w-11 rounded-2xl bg-indigo-50 flex items-center justify-center group-hover:bg-indigo-100 transition-colors">
            <Settings className="h-5 w-5 text-indigo-600" />
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-900">Conectar Cuenta</p>
            <p className="text-xs text-slate-500 mt-0.5">Agrega páginas de Facebook o Instagram</p>
          </div>
        </Link>

        <Link
          href="/bots"
          className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm hover:shadow-md transition-all hover:-translate-y-0.5 flex items-center gap-4 group"
        >
          <div className="h-11 w-11 rounded-2xl bg-emerald-50 flex items-center justify-center group-hover:bg-emerald-100 transition-colors">
            <Zap className="h-5 w-5 text-emerald-600" />
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-900">Configurar Bots</p>
            <p className="text-xs text-slate-500 mt-0.5">Configura respuestas IA y reglas</p>
          </div>
        </Link>

        <Link
          href="/comments"
          className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm hover:shadow-md transition-all hover:-translate-y-0.5 flex items-center gap-4 group"
        >
          <div className="h-11 w-11 rounded-2xl bg-slate-100 flex items-center justify-center group-hover:bg-slate-200 transition-colors">
            <MessageSquare className="h-5 w-5 text-slate-600" />
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-900">Ver Comentarios</p>
            <p className="text-xs text-slate-500 mt-0.5">{totalComments.toLocaleString()} procesados en total</p>
          </div>
        </Link>
      </div>
    </div>
  );
}
