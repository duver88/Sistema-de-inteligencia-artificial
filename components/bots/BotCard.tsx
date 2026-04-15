'use client';

import { useState } from 'react';
import { Switch } from '@/components/ui/switch';
import { FacebookIcon } from '@/components/icons/FacebookIcon';
import { InstagramIcon } from '@/components/icons/InstagramIcon';
import { toast } from 'sonner';
import Link from 'next/link';
import { ArrowRight, MessageSquare, Zap, Trash2 } from 'lucide-react';

interface BotCardProps {
  bot: {
    id: string;
    name: string;
    isActive: boolean;
    account: {
      platform: 'FACEBOOK' | 'INSTAGRAM';
      pageName: string;
      pictureUrl: string | null;
    };
    stats: {
      commentsToday: number;
      repliesToday: number;
      deletedToday: number;
    };
  };
}

export function BotCard({ bot }: BotCardProps) {
  const [isActive, setIsActive] = useState(bot.isActive);
  const [toggling, setToggling] = useState(false);

  const PlatformIcon = bot.account.platform === 'FACEBOOK' ? FacebookIcon : InstagramIcon;
  const platformColor = bot.account.platform === 'FACEBOOK' ? 'text-blue-600' : 'text-pink-600';
  const platformBg = bot.account.platform === 'FACEBOOK' ? 'bg-blue-50' : 'bg-pink-50';

  async function handleToggle(value: boolean) {
    setToggling(true);
    const previous = isActive;
    setIsActive(value);
    try {
      const res = await fetch(`/api/bots/${bot.id}/toggle`, { method: 'POST' });
      if (!res.ok) throw new Error();
      toast.success(`Bot ${value ? 'activado' : 'pausado'}`);
    } catch {
      setIsActive(previous);
      toast.error('Error al cambiar el estado del bot.');
    } finally {
      setToggling(false);
    }
  }

  return (
    <div className={`bg-white rounded-2xl border-2 transition-all duration-200 overflow-hidden ${isActive ? 'border-cyan-100 shadow-md shadow-cyan-50' : 'border-slate-100 shadow-sm'}`}>
      {/* Colored top bar */}
      <div className={`h-1.5 w-full ${isActive ? '' : 'bg-slate-200'}`}
        style={isActive ? {background: 'linear-gradient(90deg, #00C4D4, #00E5FF)'} : undefined}
      />

      <div className="p-5">
        {/* Header */}
        <div className="flex items-start justify-between mb-5">
          <div className="flex items-center gap-3">
            {bot.account.pictureUrl ? (
              <img
                src={bot.account.pictureUrl}
                alt={bot.account.pageName}
                className="h-11 w-11 rounded-full object-cover ring-2 ring-slate-100"
              />
            ) : (
              <div className={`h-11 w-11 rounded-full ${platformBg} flex items-center justify-center`}>
                <PlatformIcon className={`h-5 w-5 ${platformColor}`} />
              </div>
            )}
            <div>
              <p className="text-sm font-bold text-slate-900 leading-tight">{bot.name}</p>
              <div className="flex items-center gap-1 mt-0.5">
                <PlatformIcon className={`h-3 w-3 ${platformColor}`} />
                <p className="text-xs text-slate-500">{bot.account.pageName}</p>
              </div>
            </div>
          </div>
          <Switch
            checked={isActive}
            onCheckedChange={handleToggle}
            disabled={toggling}
            className="data-[state=checked]:bg-cyan-500 flex-shrink-0"
          />
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-2 mb-5">
          <div className="rounded-xl p-2.5 text-center bg-slate-50 border border-slate-100">
            <MessageSquare className="h-3.5 w-3.5 text-slate-400 mx-auto mb-1" />
            <p className="text-lg font-black text-slate-800">{bot.stats.commentsToday}</p>
            <p className="text-xs text-slate-400 leading-tight">Hoy</p>
          </div>
          <div className="rounded-xl p-2.5 text-center border" style={{background: '#f0fdf4', borderColor: '#bbf7d0'}}>
            <Zap className="h-3.5 w-3.5 text-emerald-500 mx-auto mb-1" />
            <p className="text-lg font-black text-emerald-700">{bot.stats.repliesToday}</p>
            <p className="text-xs text-emerald-500 leading-tight">Resp.</p>
          </div>
          <div className="rounded-xl p-2.5 text-center border" style={{background: '#fff1f2', borderColor: '#fecdd3'}}>
            <Trash2 className="h-3.5 w-3.5 text-red-400 mx-auto mb-1" />
            <p className="text-lg font-black text-red-600">{bot.stats.deletedToday}</p>
            <p className="text-xs text-red-400 leading-tight">Elim.</p>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between pt-3 border-t border-slate-100">
          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${
            isActive ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'
          }`}>
            <span className={`h-1.5 w-1.5 rounded-full ${isActive ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'}`} />
            {isActive ? 'Activo' : 'Pausado'}
          </span>
          <Link
            href={`/bots/${bot.id}`}
            className="flex items-center gap-1 text-xs font-bold text-cyan-600 hover:text-cyan-800 transition-colors group"
          >
            Configurar
            <ArrowRight className="h-3 w-3 group-hover:translate-x-0.5 transition-transform" />
          </Link>
        </div>
      </div>
    </div>
  );
}
