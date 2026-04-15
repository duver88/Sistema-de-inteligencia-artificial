import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { MessageSquare, Settings, Zap, Trash2, ArrowRight, TrendingUp } from 'lucide-react';
import Link from 'next/link';

export default async function OverviewPage() {
  const session = await auth();
  const tenantId = session?.user?.tenantId;
  if (!tenantId) return null;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const [totalBots, activeBots, commentsToday, repliesToday, deletedToday, totalComments] =
    await Promise.all([
      prisma.bot.count({ where: { tenantId } }),
      prisma.bot.count({ where: { tenantId, isActive: true } }),
      prisma.commentLog.count({ where: { tenantId, createdAt: { gte: today } } }),
      prisma.commentLog.count({ where: { tenantId, action: 'REPLIED', createdAt: { gte: today } } }),
      prisma.commentLog.count({ where: { tenantId, action: 'DELETED', createdAt: { gte: today } } }),
      prisma.commentLog.count({ where: { tenantId } }),
    ]);

  const firstName = session?.user?.name?.split(' ')[0] ?? 'usuario';

  return (
    <div className="max-w-6xl space-y-7">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900">
          Hola, {firstName} 👋
        </h1>
        <p className="text-slate-500 mt-1">
          Aquí está el resumen de tu actividad de hoy.
        </p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Bots activos */}
        <div className="rounded-2xl shadow-lg p-6 text-white" style={{background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)'}}>
          <div className="flex items-center justify-between mb-4">
            <p className="text-indigo-200 text-xs font-semibold uppercase tracking-widest">Bots Activos</p>
            <div className="h-8 w-8 rounded-lg bg-white/20 flex items-center justify-center">
              <Settings className="h-4 w-4 text-white" />
            </div>
          </div>
          <p className="text-4xl font-bold text-white">{activeBots}</p>
          <p className="text-indigo-200 text-xs mt-1">de {totalBots} en total</p>
        </div>

        {/* Comentarios hoy */}
        <div className="rounded-2xl shadow-lg p-6 text-white" style={{background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)'}}>
          <div className="flex items-center justify-between mb-4">
            <p className="text-blue-200 text-xs font-semibold uppercase tracking-widest">Comentarios</p>
            <div className="h-8 w-8 rounded-lg bg-white/20 flex items-center justify-center">
              <MessageSquare className="h-4 w-4 text-white" />
            </div>
          </div>
          <p className="text-4xl font-bold text-white">{commentsToday}</p>
          <p className="text-blue-200 text-xs mt-1">recibidos hoy</p>
        </div>

        {/* Respondidos */}
        <div className="rounded-2xl shadow-lg p-6 text-white" style={{background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)'}}>
          <div className="flex items-center justify-between mb-4">
            <p className="text-emerald-200 text-xs font-semibold uppercase tracking-widest">Respondidos</p>
            <div className="h-8 w-8 rounded-lg bg-white/20 flex items-center justify-center">
              <Zap className="h-4 w-4 text-white" />
            </div>
          </div>
          <p className="text-4xl font-bold text-white">{repliesToday}</p>
          <p className="text-emerald-200 text-xs mt-1">por IA hoy</p>
        </div>

        {/* Eliminados */}
        <div className="rounded-2xl shadow-lg p-6 text-white" style={{background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)'}}>
          <div className="flex items-center justify-between mb-4">
            <p className="text-red-200 text-xs font-semibold uppercase tracking-widest">Eliminados</p>
            <div className="h-8 w-8 rounded-lg bg-white/20 flex items-center justify-center">
              <Trash2 className="h-4 w-4 text-white" />
            </div>
          </div>
          <p className="text-4xl font-bold text-white">{deletedToday}</p>
          <p className="text-red-200 text-xs mt-1">moderados hoy</p>
        </div>
      </div>

      {/* Total procesados banner */}
      <div className="rounded-2xl p-5 border border-indigo-100 flex items-center gap-4" style={{background: 'linear-gradient(135deg, #eef2ff 0%, #e0e7ff 100%)'}}>
        <div className="h-11 w-11 rounded-xl flex items-center justify-center flex-shrink-0" style={{background: 'linear-gradient(135deg, #6366f1, #8b5cf6)'}}>
          <TrendingUp className="h-5 w-5 text-white" />
        </div>
        <div className="flex-1">
          <p className="text-sm font-semibold text-indigo-900">
            {totalComments.toLocaleString('es-CO')} comentarios procesados en total
          </p>
          <p className="text-xs text-indigo-600 mt-0.5">
            Tu plataforma de moderación sigue trabajando por ti 24/7.
          </p>
        </div>
      </div>

      {/* Quick actions */}
      <div>
        <h2 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">Acciones rápidas</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <Link
            href="/accounts"
            className="group bg-white border border-slate-200 rounded-2xl p-5 hover:border-indigo-300 hover:shadow-lg transition-all duration-200"
          >
            <div className="flex items-center justify-between mb-3">
              <div className="h-10 w-10 rounded-xl bg-indigo-50 flex items-center justify-center group-hover:bg-indigo-100 transition-colors">
                <Settings className="h-5 w-5 text-indigo-600" />
              </div>
              <ArrowRight className="h-4 w-4 text-slate-300 group-hover:text-indigo-400 group-hover:translate-x-1 transition-all" />
            </div>
            <p className="text-sm font-bold text-slate-900">Conectar Cuenta</p>
            <p className="text-xs text-slate-500 mt-0.5">Páginas de Facebook o Instagram</p>
          </Link>

          <Link
            href="/bots"
            className="group bg-white border border-slate-200 rounded-2xl p-5 hover:border-emerald-300 hover:shadow-lg transition-all duration-200"
          >
            <div className="flex items-center justify-between mb-3">
              <div className="h-10 w-10 rounded-xl bg-emerald-50 flex items-center justify-center group-hover:bg-emerald-100 transition-colors">
                <Zap className="h-5 w-5 text-emerald-600" />
              </div>
              <ArrowRight className="h-4 w-4 text-slate-300 group-hover:text-emerald-400 group-hover:translate-x-1 transition-all" />
            </div>
            <p className="text-sm font-bold text-slate-900">Configurar Bots</p>
            <p className="text-xs text-slate-500 mt-0.5">Respuestas IA y reglas de moderación</p>
          </Link>

          <Link
            href="/comments"
            className="group bg-white border border-slate-200 rounded-2xl p-5 hover:border-blue-300 hover:shadow-lg transition-all duration-200"
          >
            <div className="flex items-center justify-between mb-3">
              <div className="h-10 w-10 rounded-xl bg-blue-50 flex items-center justify-center group-hover:bg-blue-100 transition-colors">
                <MessageSquare className="h-5 w-5 text-blue-600" />
              </div>
              <ArrowRight className="h-4 w-4 text-slate-300 group-hover:text-blue-400 group-hover:translate-x-1 transition-all" />
            </div>
            <p className="text-sm font-bold text-slate-900">Ver Comentarios</p>
            <p className="text-xs text-slate-500 mt-0.5">{totalComments.toLocaleString('es-CO')} procesados en total</p>
          </Link>
        </div>
      </div>
    </div>
  );
}
