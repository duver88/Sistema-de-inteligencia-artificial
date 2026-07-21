'use client';

import { useCallback, useEffect, useState } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { enUS } from 'date-fns/locale';
import {
  Bot as BotIcon,
  CheckCircle2,
  Globe,
  Link2Off,
  Loader2,
  Pause,
  Play,
  PlugZap,
  RefreshCw,
  Webhook,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { UserAvatar } from '@/components/ui/UserAvatar';

interface AdminAccount {
  id: string;
  platform: string;
  pageName: string;
  pictureUrl: string | null;
  isActive: boolean;
  webhookSubscribed: boolean;
  connectedAt: string;
  tenant: { id: string; name: string };
}

interface AdminBot {
  id: string;
  name: string;
  isActive: boolean;
  aiModel: string | null;
  platform: string;
  pageName: string;
  tenant: { id: string; name: string };
  commentCount: number;
}

const PLATFORM_CONFIG: Record<string, { label: string; className: string }> = {
  FACEBOOK: { label: 'Facebook', className: 'bg-blue-50 text-blue-700 border-blue-200' },
  INSTAGRAM: { label: 'Instagram', className: 'bg-pink-50 text-pink-700 border-pink-200' },
};

function PlatformBadge({ platform }: { platform: string }) {
  const config = PLATFORM_CONFIG[platform?.toUpperCase()] ?? {
    label: platform || 'Unknown',
    className: 'bg-slate-100 text-slate-600 border-slate-200',
  };
  const { label, className } = config;
  return (
    <span
      className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium border ${className}`}
    >
      <Globe className="h-3 w-3" />
      {label}
    </span>
  );
}

function formatConnectedAt(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return formatDistanceToNow(date, { addSuffix: true, locale: enUS });
}

export function PagesAndBotsPanel() {
  const [accounts, setAccounts] = useState<AdminAccount[]>([]);
  const [bots, setBots] = useState<AdminBot[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [disconnectAccount, setDisconnectAccount] = useState<AdminAccount | null>(null);
  const [disconnectingId, setDisconnectingId] = useState<string | null>(null);
  const [togglingBotId, setTogglingBotId] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setError(null);
    try {
      const [accountsRes, botsRes] = await Promise.all([
        fetch('/api/admin/accounts', { cache: 'no-store' }),
        fetch('/api/admin/bots', { cache: 'no-store' }),
      ]);
      if (!accountsRes.ok || !botsRes.ok) throw new Error();
      const accountsData = (await accountsRes.json()) as { accounts?: AdminAccount[] };
      const botsData = (await botsRes.json()) as { bots?: AdminBot[] };
      setAccounts(Array.isArray(accountsData.accounts) ? accountsData.accounts : []);
      setBots(Array.isArray(botsData.bots) ? botsData.bots : []);
    } catch {
      setError('Failed to load pages and bots. Please try again.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchData();
  }, [fetchData]);

  async function handleDisconnect(account: AdminAccount) {
    setDisconnectingId(account.id);
    try {
      const res = await fetch(`/api/admin/accounts/${account.id}/disconnect`, {
        method: 'POST',
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        toast.error(data.error ?? 'Failed to disconnect page');
        return;
      }
      // Disconnecting deactivates the page and all of its bots server-side.
      setAccounts((prev) =>
        prev.map((a) => (a.id === account.id ? { ...a, isActive: false } : a)),
      );
      setBots((prev) =>
        prev.map((b) =>
          b.pageName === account.pageName && b.tenant.id === account.tenant.id
            ? { ...b, isActive: false }
            : b,
        ),
      );
      toast.success(`${account.pageName} disconnected`);
    } catch {
      toast.error('Failed to disconnect page');
    } finally {
      setDisconnectingId(null);
    }
  }

  async function handleToggleBot(bot: AdminBot) {
    setTogglingBotId(bot.id);
    try {
      const res = await fetch(`/api/admin/bots/${bot.id}/toggle`, { method: 'POST' });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(data.error ?? 'Failed to update bot');
        return;
      }
      const nextActive = typeof data.isActive === 'boolean' ? data.isActive : !bot.isActive;
      setBots((prev) =>
        prev.map((b) => (b.id === bot.id ? { ...b, isActive: nextActive } : b)),
      );
      toast.success(nextActive ? `${bot.name} activated` : `${bot.name} paused`);
    } catch {
      toast.error('Failed to update bot');
    } finally {
      setTogglingBotId(null);
    }
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 bg-white border border-slate-200 rounded-2xl shadow-sm">
        <Loader2 className="h-6 w-6 text-slate-400 animate-spin mb-3" />
        <p className="text-sm text-slate-500">Loading pages and bots…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-24 bg-white border border-slate-200 rounded-2xl shadow-sm">
        <p className="text-sm font-semibold text-slate-900 mb-1">Something went wrong</p>
        <p className="text-xs text-slate-500 mb-4">{error}</p>
        <button
          type="button"
          onClick={() => { setLoading(true); void fetchData(); }}
          className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-slate-600 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Toolbar */}
      <div className="flex items-center justify-end">
        <button
          type="button"
          onClick={() => void fetchData()}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          Refresh
        </button>
      </div>

      {/* Connected pages */}
      <section>
        <div className="flex items-center gap-3 mb-4">
          <div className="h-10 w-10 rounded-xl bg-slate-100 flex items-center justify-center flex-shrink-0">
            <PlugZap className="h-5 w-5 text-slate-500" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-slate-900">Connected pages</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Every social page connected across all tenants.
            </p>
          </div>
        </div>

        {accounts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 bg-white border border-slate-200 rounded-2xl shadow-sm">
            <div className="h-14 w-14 bg-slate-100 rounded-2xl flex items-center justify-center mb-4">
              <PlugZap className="h-7 w-7 text-slate-400" />
            </div>
            <p className="text-sm font-semibold text-slate-900 mb-1">No pages connected</p>
            <p className="text-xs text-slate-500">Connected pages will appear here.</p>
          </div>
        ) : (
          <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50">
                    <th className="text-left px-5 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wide">Page</th>
                    <th className="text-left px-5 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wide">Platform</th>
                    <th className="text-left px-5 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wide">Tenant</th>
                    <th className="text-left px-5 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wide">Webhook</th>
                    <th className="text-left px-5 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wide">Status</th>
                    <th className="text-left px-5 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wide">Connected</th>
                    <th className="text-right px-5 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wide">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {accounts.map((account) => (
                    <tr key={account.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50/80 transition-colors">
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-3">
                          <UserAvatar name={account.pageName} image={account.pictureUrl} size={36} />
                          <p className="text-sm font-medium text-slate-900 truncate max-w-[200px]">
                            {account.pageName}
                          </p>
                        </div>
                      </td>
                      <td className="px-5 py-3.5">
                        <PlatformBadge platform={account.platform} />
                      </td>
                      <td className="px-5 py-3.5 text-sm text-slate-700 truncate max-w-[160px]">
                        {account.tenant.name}
                      </td>
                      <td className="px-5 py-3.5">
                        {account.webhookSubscribed ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                            <Webhook className="h-3 w-3" />
                            Subscribed
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-500 border border-slate-200">
                            <Webhook className="h-3 w-3" />
                            Not subscribed
                          </span>
                        )}
                      </td>
                      <td className="px-5 py-3.5">
                        {account.isActive ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                            <CheckCircle2 className="h-3 w-3" />
                            Active
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-500 border border-slate-200">
                            <Link2Off className="h-3 w-3" />
                            Disconnected
                          </span>
                        )}
                      </td>
                      <td className="px-5 py-3.5 text-xs text-slate-500 whitespace-nowrap">
                        {formatConnectedAt(account.connectedAt)}
                      </td>
                      <td className="px-5 py-3.5">
                        <div className="flex items-center justify-end">
                          <button
                            type="button"
                            onClick={() => setDisconnectAccount(account)}
                            disabled={!account.isActive || disconnectingId === account.id}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-red-600 bg-white border border-red-200 rounded-lg hover:bg-red-50 transition-colors disabled:opacity-30 disabled:hover:bg-white"
                            title={account.isActive ? 'Disconnect page' : 'Already disconnected'}
                          >
                            {disconnectingId === account.id ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            ) : (
                              <Link2Off className="h-3.5 w-3.5" />
                            )}
                            Disconnect
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </section>

      {/* Bots */}
      <section>
        <div className="flex items-center gap-3 mb-4">
          <div className="h-10 w-10 rounded-xl bg-slate-100 flex items-center justify-center flex-shrink-0">
            <BotIcon className="h-5 w-5 text-slate-500" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-slate-900">Bots</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Automation bots running across all tenants.
            </p>
          </div>
        </div>

        {bots.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 bg-white border border-slate-200 rounded-2xl shadow-sm">
            <div className="h-14 w-14 bg-slate-100 rounded-2xl flex items-center justify-center mb-4">
              <BotIcon className="h-7 w-7 text-slate-400" />
            </div>
            <p className="text-sm font-semibold text-slate-900 mb-1">No bots yet</p>
            <p className="text-xs text-slate-500">Bots created by tenants will appear here.</p>
          </div>
        ) : (
          <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50">
                    <th className="text-left px-5 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wide">Bot</th>
                    <th className="text-left px-5 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wide">Tenant</th>
                    <th className="text-left px-5 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wide">Page</th>
                    <th className="text-left px-5 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wide">Model</th>
                    <th className="text-center px-3 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wide">Comments</th>
                    <th className="text-left px-5 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wide">Status</th>
                    <th className="text-right px-5 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wide">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {bots.map((bot) => (
                    <tr key={bot.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50/80 transition-colors">
                      <td className="px-5 py-3.5">
                        <p className="text-sm font-medium text-slate-900 truncate max-w-[200px]">
                          {bot.name}
                        </p>
                      </td>
                      <td className="px-5 py-3.5 text-sm text-slate-700 truncate max-w-[160px]">
                        {bot.tenant.name}
                      </td>
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-2">
                          <PlatformBadge platform={bot.platform} />
                          <span className="text-xs text-slate-500 truncate max-w-[140px]">
                            {bot.pageName}
                          </span>
                        </div>
                      </td>
                      <td className="px-5 py-3.5">
                        {bot.aiModel ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-mono font-medium bg-slate-100 text-slate-600 border border-slate-200">
                            {bot.aiModel}
                          </span>
                        ) : (
                          <span className="text-xs text-slate-400">—</span>
                        )}
                      </td>
                      <td className="px-3 py-3.5 text-center text-slate-600">{bot.commentCount}</td>
                      <td className="px-5 py-3.5">
                        {bot.isActive ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                            <CheckCircle2 className="h-3 w-3" />
                            Active
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-amber-50 text-amber-700 border border-amber-200">
                            <Pause className="h-3 w-3" />
                            Paused
                          </span>
                        )}
                      </td>
                      <td className="px-5 py-3.5">
                        <div className="flex items-center justify-end">
                          <button
                            type="button"
                            onClick={() => void handleToggleBot(bot)}
                            disabled={togglingBotId === bot.id}
                            className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-white border rounded-lg transition-colors disabled:opacity-40 ${
                              bot.isActive
                                ? 'text-amber-600 border-amber-200 hover:bg-amber-50'
                                : 'text-emerald-600 border-emerald-200 hover:bg-emerald-50'
                            }`}
                            title={bot.isActive ? 'Pause bot' : 'Activate bot'}
                          >
                            {togglingBotId === bot.id ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            ) : bot.isActive ? (
                              <Pause className="h-3.5 w-3.5" />
                            ) : (
                              <Play className="h-3.5 w-3.5" />
                            )}
                            {bot.isActive ? 'Pause' : 'Activate'}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </section>

      {/* Disconnect confirmation */}
      <AlertDialog
        open={!!disconnectAccount}
        onOpenChange={(open) => { if (!open) setDisconnectAccount(null); }}
      >
        <AlertDialogContent className="bg-white">
          <AlertDialogHeader>
            <AlertDialogTitle>
              Disconnect {disconnectAccount?.pageName ?? 'page'}?
            </AlertDialogTitle>
            <AlertDialogDescription>
              This deactivates the page and pauses all of its bots. Comments will
              no longer be processed until the tenant reconnects it. This does not
              delete the page or its history.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <button
              type="button"
              onClick={() => {
                const account = disconnectAccount;
                setDisconnectAccount(null);
                if (account) void handleDisconnect(account);
              }}
              className="inline-flex items-center justify-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors"
            >
              <Link2Off className="h-4 w-4" />
              Disconnect page
            </button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
