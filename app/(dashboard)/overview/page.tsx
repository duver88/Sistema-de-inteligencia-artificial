import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { redirect } from 'next/navigation';
import { MessageSquare, Settings, Zap, Trash2, ArrowRight, TrendingUp, Link2 } from 'lucide-react';
import Link from 'next/link';

export default async function OverviewPage() {
  const session = await auth();
  if (session?.user?.isSuperAdmin) redirect('/admin');
  const tenantId = session?.user?.tenantId;
  if (!tenantId) return null;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const [totalBots, activeBots, commentsToday, repliesToday, deletedToday, totalComments, accountCount] =
    await Promise.all([
      prisma.bot.count({ where: { tenantId } }),
      prisma.bot.count({ where: { tenantId, isActive: true } }),
      prisma.commentLog.count({ where: { tenantId, createdAt: { gte: today } } }),
      prisma.commentLog.count({ where: { tenantId, action: 'REPLIED', createdAt: { gte: today } } }),
      prisma.commentLog.count({ where: { tenantId, action: 'DELETED', createdAt: { gte: today } } }),
      prisma.commentLog.count({ where: { tenantId } }),
      prisma.socialAccount.count({ where: { tenantId, isActive: true } }),
    ]);

  const firstName = session?.user?.name?.split(' ')[0] ?? 'user';

  return (
    <div className="max-w-6xl space-y-7">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900">
          Hi, {firstName} 👋
        </h1>
        <p className="text-slate-500 mt-1">
          Here's a summary of your activity today.
        </p>
      </div>

      {/* Onboarding CTA — shown only while the tenant has no connected accounts */}
      {accountCount === 0 && (
        <div
          className="rounded-2xl p-6 border flex flex-col sm:flex-row items-start sm:items-center gap-5"
          style={{ background: 'linear-gradient(135deg, #ecfeff 0%, #cffafe 100%)', borderColor: '#a5f3fc' }}
        >
          <div
            className="h-12 w-12 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ background: 'linear-gradient(135deg, #00C4D4, #00E5FF)' }}
          >
            <Link2 className="h-6 w-6" style={{ color: '#0a1628' }} />
          </div>
          <div className="flex-1">
            <p className="text-base font-bold" style={{ color: '#0a1628' }}>
              Connect your Facebook account to get started
            </p>
            <p className="text-sm mt-1 text-cyan-700">
              Link a Facebook page or Instagram account and let AI reply to and
              moderate your comments automatically.
            </p>
          </div>
          <Link
            href="/accounts"
            className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-bold rounded-xl transition-all shadow-md hover:shadow-lg active:scale-95 flex-shrink-0"
            style={{ background: 'linear-gradient(135deg, #00C4D4, #00E5FF)', color: '#0a1628' }}
          >
            Connect Account
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      )}

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Bots activos */}
        <div className="rounded-2xl shadow-lg p-6 text-white" style={{background: 'linear-gradient(135deg, #00C4D4 0%, #00E5FF 100%)'}}>
          <div className="flex items-center justify-between mb-4">
            <p className="text-xs font-semibold uppercase tracking-widest" style={{color: '#0a1628', opacity: 0.7}}>Active Bots</p>
            <div className="h-8 w-8 rounded-lg bg-white/20 flex items-center justify-center">
              <Settings className="h-4 w-4 text-white" />
            </div>
          </div>
          <p className="text-4xl font-bold" style={{color: '#0a1628'}}>{activeBots}</p>
          <p className="text-xs mt-1" style={{color: '#0a1628', opacity: 0.6}}>of {totalBots} total</p>
        </div>

        {/* Comentarios hoy */}
        <div className="rounded-2xl shadow-lg p-6 text-white" style={{background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)'}}>
          <div className="flex items-center justify-between mb-4">
            <p className="text-blue-200 text-xs font-semibold uppercase tracking-widest">Comments</p>
            <div className="h-8 w-8 rounded-lg bg-white/20 flex items-center justify-center">
              <MessageSquare className="h-4 w-4 text-white" />
            </div>
          </div>
          <p className="text-4xl font-bold text-white">{commentsToday}</p>
          <p className="text-blue-200 text-xs mt-1">received today</p>
        </div>

        {/* Respondidos */}
        <div className="rounded-2xl shadow-lg p-6 text-white" style={{background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)'}}>
          <div className="flex items-center justify-between mb-4">
            <p className="text-emerald-200 text-xs font-semibold uppercase tracking-widest">Replied</p>
            <div className="h-8 w-8 rounded-lg bg-white/20 flex items-center justify-center">
              <Zap className="h-4 w-4 text-white" />
            </div>
          </div>
          <p className="text-4xl font-bold text-white">{repliesToday}</p>
          <p className="text-emerald-200 text-xs mt-1">by AI today</p>
        </div>

        {/* Eliminados */}
        <div className="rounded-2xl shadow-lg p-6 text-white" style={{background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)'}}>
          <div className="flex items-center justify-between mb-4">
            <p className="text-red-200 text-xs font-semibold uppercase tracking-widest">Deleted</p>
            <div className="h-8 w-8 rounded-lg bg-white/20 flex items-center justify-center">
              <Trash2 className="h-4 w-4 text-white" />
            </div>
          </div>
          <p className="text-4xl font-bold text-white">{deletedToday}</p>
          <p className="text-red-200 text-xs mt-1">moderated today</p>
        </div>
      </div>

      {/* Total procesados banner */}
      <div className="rounded-2xl p-5 border flex items-center gap-4" style={{background: 'linear-gradient(135deg, #ecfeff 0%, #cffafe 100%)', borderColor: '#a5f3fc'}}>
        <div className="h-11 w-11 rounded-xl flex items-center justify-center flex-shrink-0" style={{background: 'linear-gradient(135deg, #00C4D4, #00E5FF)'}}>
          <TrendingUp className="h-5 w-5" style={{color: '#0a1628'}} />
        </div>
        <div className="flex-1">
          <p className="text-sm font-semibold" style={{color: '#0a1628'}}>
            {totalComments.toLocaleString('en-US')} comments processed in total
          </p>
          <p className="text-xs mt-0.5 text-cyan-700">
            Your moderation platform keeps working for you 24/7.
          </p>
        </div>
      </div>

      {/* Quick actions */}
      <div>
        <h2 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">Quick actions</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <Link
            href="/accounts"
            className="group bg-white border border-slate-200 rounded-2xl p-5 hover:border-cyan-300 hover:shadow-lg transition-all duration-200"
          >
            <div className="flex items-center justify-between mb-3">
              <div className="h-10 w-10 rounded-xl bg-cyan-50 flex items-center justify-center group-hover:bg-cyan-100 transition-colors">
                <Settings className="h-5 w-5 text-cyan-600" />
              </div>
              <ArrowRight className="h-4 w-4 text-slate-300 group-hover:text-cyan-400 group-hover:translate-x-1 transition-all" />
            </div>
            <p className="text-sm font-bold text-slate-900">Connect Account</p>
            <p className="text-xs text-slate-500 mt-0.5">Facebook or Instagram pages</p>
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
            <p className="text-sm font-bold text-slate-900">Configure Bots</p>
            <p className="text-xs text-slate-500 mt-0.5">AI replies and moderation rules</p>
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
            <p className="text-sm font-bold text-slate-900">View Comments</p>
            <p className="text-xs text-slate-500 mt-0.5">{totalComments.toLocaleString('en-US')} processed in total</p>
          </Link>
        </div>
      </div>
    </div>
  );
}
