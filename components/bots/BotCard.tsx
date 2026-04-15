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
    setIsActive(value); // Optimistic update
    try {
      const res = await fetch(`/api/bots/${bot.id}/toggle`, { method: 'POST' });
      if (!res.ok) throw new Error();
      toast.success(`Bot ${value ? 'activated' : 'paused'}`);
    } catch {
      setIsActive(previous); // Revert on error
      toast.error('Failed to toggle bot. Please try again.');
    } finally {
      setToggling(false);
    }
  }

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm hover:shadow-md transition-shadow">
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          {bot.account.pictureUrl ? (
            <img
              src={bot.account.pictureUrl}
              alt={bot.account.pageName}
              className="h-10 w-10 rounded-full object-cover"
            />
          ) : (
            <div className="h-10 w-10 rounded-full bg-slate-100 flex items-center justify-center">
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
      <div className="grid grid-cols-3 gap-2 mb-4">
        <div className="text-center py-2 bg-slate-50 rounded-lg">
          <p className="text-lg font-semibold text-slate-900">{bot.stats.commentsToday}</p>
          <p className="text-xs text-slate-500">Comments</p>
        </div>
        <div className="text-center py-2 bg-emerald-50 rounded-lg">
          <p className="text-lg font-semibold text-emerald-700">{bot.stats.repliesToday}</p>
          <p className="text-xs text-emerald-600">Replied</p>
        </div>
        <div className="text-center py-2 bg-red-50 rounded-lg">
          <p className="text-lg font-semibold text-red-700">{bot.stats.deletedToday}</p>
          <p className="text-xs text-red-600">Deleted</p>
        </div>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between">
        <span
          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${
            isActive
              ? 'bg-emerald-50 text-emerald-700'
              : 'bg-slate-100 text-slate-600'
          }`}
        >
          <span
            className={`h-1.5 w-1.5 rounded-full ${
              isActive ? 'bg-emerald-500' : 'bg-slate-400'
            }`}
          />
          {isActive ? 'Active' : 'Paused'}
        </span>
        <Link
          href={`/bots/${bot.id}`}
          className="text-xs font-medium text-indigo-600 hover:text-indigo-700 transition-colors"
        >
          Configure →
        </Link>
      </div>
    </div>
  );
}
