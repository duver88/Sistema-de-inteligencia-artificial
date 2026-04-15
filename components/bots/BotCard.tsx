'use client';

import { useState } from 'react';
import { Switch } from '@/components/ui/switch';
import { FacebookIcon } from '@/components/icons/FacebookIcon';
import { InstagramIcon } from '@/components/icons/InstagramIcon';
import { toast } from 'sonner';
import Link from 'next/link';

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
      toast.error('Error al cambiar el estado del bot. Inténtalo de nuevo.');
    } finally {
      setToggling(false);
    }
  }

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm hover:shadow-md transition-all hover:-translate-y-0.5">
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
            <div className="h-11 w-11 rounded-full bg-slate-100 flex items-center justify-center">
              <PlatformIcon className={`h-5 w-5 ${platformColor}`} />
            </div>
          )}
          <div>
            <p className="text-sm font-semibold text-slate-900 leading-tight">
              {bot.name}
            </p>
            <p className="text-xs text-slate-500 mt-0.5 flex items-center gap-1">
              <PlatformIcon className={`h-3 w-3 ${platformColor}`} />
              {bot.account.pageName}
            </p>
          </div>
        </div>
        <Switch
          checked={isActive}
          onCheckedChange={handleToggle}
          disabled={toggling}
          className="data-[state=checked]:bg-indigo-600 flex-shrink-0"
        />
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-2 mb-5">
        <div className="text-center py-2.5 bg-slate-50 rounded-xl">
          <p className="text-xl font-bold text-slate-900">{bot.stats.commentsToday}</p>
          <p className="text-xs text-slate-500 mt-0.5">Comentarios</p>
        </div>
        <div className="text-center py-2.5 bg-emerald-50 rounded-xl">
          <p className="text-xl font-bold text-emerald-700">{bot.stats.repliesToday}</p>
          <p className="text-xs text-emerald-600 mt-0.5">Respondidos</p>
        </div>
        <div className="text-center py-2.5 bg-red-50 rounded-xl">
          <p className="text-xl font-bold text-red-700">{bot.stats.deletedToday}</p>
          <p className="text-xs text-red-600 mt-0.5">Eliminados</p>
        </div>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between">
        <span
          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${
            isActive
              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
              : 'bg-slate-100 text-slate-600 border border-slate-200'
          }`}
        >
          <span
            className={`h-1.5 w-1.5 rounded-full ${
              isActive ? 'bg-emerald-500' : 'bg-slate-400'
            }`}
          />
          {isActive ? 'Activo' : 'Pausado'}
        </span>
        <Link
          href={`/bots/${bot.id}`}
          className="text-xs font-semibold text-indigo-600 hover:text-indigo-700 transition-colors flex items-center gap-1"
        >
          Configurar →
        </Link>
      </div>
    </div>
  );
}
