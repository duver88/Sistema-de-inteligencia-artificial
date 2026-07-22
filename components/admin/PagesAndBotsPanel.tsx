'use client';

import { useEffect, useState } from 'react';
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
  Search,
  Webhook,
  X,
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
    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium border ${className}`}>
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

function Pagination({
  page, totalPages, total, onPage,
}: { page: number; totalPages: number; total: number; onPage: (p: number) => void }) {
  if (totalPages <= 1) {
    return <div className="px-5 py-3 text-xs text-slate-400 border-t border-slate-100">{total} total</div>;
  }
  return (
    <div className="flex items-center justify-between px-5 py-3 border-t border-slate-100">
      <span className="text-xs text-slate-400">{total} total</span>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => onPage(page - 1)}
          disabled={page <= 1}
          className="px-3 py-1.5 text-xs font-medium text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors disabled:opacity-30"
        >
          Previous
        </button>
        <span className="text-xs text-slate-500">Page {page} of {totalPages}</span>
        <button
          type="button"
          onClick={() => onPage(page + 1)}
          disabled={page >= totalPages}
          className="px-3 py-1.5 text-xs font-medium text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors disabled:opacity-30"
        >
          Next
        </button>
      </div>
    </div>
  );
}

export function PagesAndBotsPanel() {
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');

  const [accounts, setAccounts] = useState<AdminAccount[]>([]);
  const [accountsPage, setAccountsPage] = useState(1);
  const [accountsTotalPages, setAccountsTotalPages] = useState(1);
  const [accountsTotal, setAccountsTotal] = useState(0);
  const [accountsLoading, setAccountsLoading] = useState(true);

  const [bots, setBots] = useState<AdminBot[]>([]);
  const [botsPage, setBotsPage] = useState(1);
  const [botsTotalPages, setBotsTotalPages] = useState(1);
  const [botsTotal, setBotsTotal] = useState(0);
  const [botsLoading, setBotsLoading] = useState(true);

  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  const [disconnectAccount, setDisconnectAccount] = useState<AdminAccount | null>(null);
  const [disconnectingId, setDisconnectingId] = useState<string | null>(null);
  const [togglingBotId, setTogglingBotId] = useState<string | null>(null);

  // Debounce the search box; changing the query resets both tables to page 1.
  useEffect(() => {
    const t = setTimeout(() => {
      setSearch(searchInput.trim());
      setAccountsPage(1);
      setBotsPage(1);
    }, 300);
    return () => clearTimeout(t);
  }, [searchInput]);

  // Fetch pages (paginated + filtered). Ignores out-of-order responses.
  useEffect(() => {
    let active = true;
    setAccountsLoading(true);
    const params = new URLSearchParams({ page: String(accountsPage) });
    if (search) params.set('search', search);
    fetch(`/api/admin/accounts?${params.toString()}`, { cache: 'no-store' })
      .then(async (res) => {
        if (!res.ok) throw new Error();
        const data = (await res.json()) as { accounts?: AdminAccount[]; total?: number; totalPages?: number };
        if (!active) return;
        setAccounts(Array.isArray(data.accounts) ? data.accounts : []);
        setAccountsTotal(data.total ?? 0);
        setAccountsTotalPages(Math.max(1, data.totalPages ?? 1));
      })
      .catch(() => { if (active) setError('Failed to load pages. Please try again.'); })
      .finally(() => { if (active) setAccountsLoading(false); });
    return () => { active = false; };
  }, [search, accountsPage, reloadKey]);

  // Fetch bots (paginated + filtered).
  useEffect(() => {
    let active = true;
    setBotsLoading(true);
    const params = new URLSearchParams({ page: String(botsPage) });
    if (search) params.set('search', search);
    fetch(`/api/admin/bots?${params.toString()}`, { cache: 'no-store' })
      .then(async (res) => {
        if (!res.ok) throw new Error();
        const data = (await res.json()) as { bots?: AdminBot[]; total?: number; totalPages?: number };
        if (!active) return;
        setBots(Array.isArray(data.bots) ? data.bots : []);
        setBotsTotal(data.total ?? 0);
        setBotsTotalPages(Math.max(1, data.totalPages ?? 1));
      })
      .catch(() => { if (active) setError('Failed to load bots. Please try again.'); })
      .finally(() => { if (active) setBotsLoading(false); });
    return () => { active = false; };
  }, [search, botsPage, reloadKey]);

  function filterByOwner(name: string) {
    setSearchInput(name);
  }

  async function handleDisconnect(account: AdminAccount) {
    setDisconnectingId(account.id);
    try {
      const res = await fetch(`/api/admin/accounts/${account.id}/disconnect`, { method: 'POST' });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        toast.error(data.error ?? 'Failed to disconnect page');
        return;
      }
      setAccounts((prev) => prev.map((a) => (a.id === account.id ? { ...a, isActive: false } : a)));
      setBots((prev) =>
        prev.map((b) =>
          b.pageName === account.pageName && b.tenant.id === account.tenant.id ? { ...b, isActive: false } : b,
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
      setBots((prev) => prev.map((b) => (b.id === bot.id ? { ...b, isActive: nextActive } : b)));
      toast.success(nextActive ? `${bot.name} activated` : `${bot.name} paused`);
    } catch {
      toast.error('Failed to update bot');
    } finally {
      setTogglingBotId(null);
    }
  }

  return (
    <div className="space-y-8">
      {/* Toolbar: search + refresh */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Filter by page, bot or owner name…"
            className="w-full pl-9 pr-9 py-2 text-sm border border-slate-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:border-transparent"
          />
          {searchInput && (
            <button
              type="button"
              onClick={() => setSearchInput('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              title="Clear filter"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
        <button
          type="button"
          onClick={() => setReloadKey((k) => k + 1)}
          className="inline-flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          Refresh
        </button>
      </div>

      {error && (
        <div className="rounded-xl bg-red-50 border border-red-200 px-4 py-2.5 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Connected pages */}
      <section>
        <div className="flex items-center gap-3 mb-4">
          <div className="h-10 w-10 rounded-xl bg-slate-100 flex items-center justify-center flex-shrink-0">
            <PlugZap className="h-5 w-5 text-slate-500" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-slate-900">Connected pages</h2>
            <p className="text-xs text-slate-500 mt-0.5">Social pages connected across all tenants.</p>
          </div>
        </div>

        {accountsLoading ? (
          <div className="flex items-center justify-center py-16 bg-white border border-slate-200 rounded-2xl shadow-sm">
            <Loader2 className="h-5 w-5 text-slate-400 animate-spin" />
          </div>
        ) : accounts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 bg-white border border-slate-200 rounded-2xl shadow-sm">
            <div className="h-14 w-14 bg-slate-100 rounded-2xl flex items-center justify-center mb-4">
              <PlugZap className="h-7 w-7 text-slate-400" />
            </div>
            <p className="text-sm font-semibold text-slate-900 mb-1">No pages found</p>
            <p className="text-xs text-slate-500">{search ? 'Try a different filter.' : 'Connected pages will appear here.'}</p>
          </div>
        ) : (
          <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50">
                    <th className="text-left px-5 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wide">Page</th>
                    <th className="text-left px-5 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wide">Platform</th>
                    <th className="text-left px-5 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wide">Owner</th>
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
                          <p className="text-sm font-medium text-slate-900 truncate max-w-[200px]">{account.pageName}</p>
                        </div>
                      </td>
                      <td className="px-5 py-3.5"><PlatformBadge platform={account.platform} /></td>
                      <td className="px-5 py-3.5">
                        <button
                          type="button"
                          onClick={() => filterByOwner(account.tenant.name)}
                          className="text-sm text-slate-700 hover:text-cyan-600 hover:underline truncate max-w-[160px] text-left"
                          title="Filter by this owner"
                        >
                          {account.tenant.name}
                        </button>
                      </td>
                      <td className="px-5 py-3.5">
                        {account.webhookSubscribed ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                            <Webhook className="h-3 w-3" />Subscribed
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-500 border border-slate-200">
                            <Webhook className="h-3 w-3" />Not subscribed
                          </span>
                        )}
                      </td>
                      <td className="px-5 py-3.5">
                        {account.isActive ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                            <CheckCircle2 className="h-3 w-3" />Active
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-500 border border-slate-200">
                            <Link2Off className="h-3 w-3" />Disconnected
                          </span>
                        )}
                      </td>
                      <td className="px-5 py-3.5 text-xs text-slate-500 whitespace-nowrap">{formatConnectedAt(account.connectedAt)}</td>
                      <td className="px-5 py-3.5">
                        <div className="flex items-center justify-end">
                          <button
                            type="button"
                            onClick={() => setDisconnectAccount(account)}
                            disabled={!account.isActive || disconnectingId === account.id}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-red-600 bg-white border border-red-200 rounded-lg hover:bg-red-50 transition-colors disabled:opacity-30 disabled:hover:bg-white"
                            title={account.isActive ? 'Disconnect page' : 'Already disconnected'}
                          >
                            {disconnectingId === account.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Link2Off className="h-3.5 w-3.5" />}
                            Disconnect
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Pagination page={accountsPage} totalPages={accountsTotalPages} total={accountsTotal} onPage={setAccountsPage} />
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
            <p className="text-xs text-slate-500 mt-0.5">Automation bots running across all tenants.</p>
          </div>
        </div>

        {botsLoading ? (
          <div className="flex items-center justify-center py-16 bg-white border border-slate-200 rounded-2xl shadow-sm">
            <Loader2 className="h-5 w-5 text-slate-400 animate-spin" />
          </div>
        ) : bots.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 bg-white border border-slate-200 rounded-2xl shadow-sm">
            <div className="h-14 w-14 bg-slate-100 rounded-2xl flex items-center justify-center mb-4">
              <BotIcon className="h-7 w-7 text-slate-400" />
            </div>
            <p className="text-sm font-semibold text-slate-900 mb-1">No bots found</p>
            <p className="text-xs text-slate-500">{search ? 'Try a different filter.' : 'Bots created by tenants will appear here.'}</p>
          </div>
        ) : (
          <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50">
                    <th className="text-left px-5 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wide">Bot</th>
                    <th className="text-left px-5 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wide">Owner</th>
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
                        <p className="text-sm font-medium text-slate-900 truncate max-w-[200px]">{bot.name}</p>
                      </td>
                      <td className="px-5 py-3.5">
                        <button
                          type="button"
                          onClick={() => filterByOwner(bot.tenant.name)}
                          className="text-sm text-slate-700 hover:text-cyan-600 hover:underline truncate max-w-[160px] text-left"
                          title="Filter by this owner"
                        >
                          {bot.tenant.name}
                        </button>
                      </td>
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-2">
                          <PlatformBadge platform={bot.platform} />
                          <span className="text-xs text-slate-500 truncate max-w-[140px]">{bot.pageName}</span>
                        </div>
                      </td>
                      <td className="px-5 py-3.5">
                        {bot.aiModel ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-mono font-medium bg-slate-100 text-slate-600 border border-slate-200">{bot.aiModel}</span>
                        ) : (
                          <span className="text-xs text-slate-400">—</span>
                        )}
                      </td>
                      <td className="px-3 py-3.5 text-center text-slate-600">{bot.commentCount}</td>
                      <td className="px-5 py-3.5">
                        {bot.isActive ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                            <CheckCircle2 className="h-3 w-3" />Active
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-amber-50 text-amber-700 border border-amber-200">
                            <Pause className="h-3 w-3" />Paused
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
                              bot.isActive ? 'text-amber-600 border-amber-200 hover:bg-amber-50' : 'text-emerald-600 border-emerald-200 hover:bg-emerald-50'
                            }`}
                            title={bot.isActive ? 'Pause bot' : 'Activate bot'}
                          >
                            {togglingBotId === bot.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : bot.isActive ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
                            {bot.isActive ? 'Pause' : 'Activate'}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Pagination page={botsPage} totalPages={botsTotalPages} total={botsTotal} onPage={setBotsPage} />
          </div>
        )}
      </section>

      {/* Disconnect confirmation */}
      <AlertDialog open={!!disconnectAccount} onOpenChange={(open) => { if (!open) setDisconnectAccount(null); }}>
        <AlertDialogContent className="bg-white">
          <AlertDialogHeader>
            <AlertDialogTitle>Disconnect {disconnectAccount?.pageName ?? 'page'}?</AlertDialogTitle>
            <AlertDialogDescription>
              This deactivates the page and pauses all of its bots. Comments will no longer be processed until the tenant
              reconnects it. This does not delete the page or its history.
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
