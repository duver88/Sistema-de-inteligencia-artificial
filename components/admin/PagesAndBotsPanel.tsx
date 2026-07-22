'use client';

import { useEffect, useState } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { enUS } from 'date-fns/locale';
import {
  Bot as BotIcon,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Globe,
  Layers,
  Link2Off,
  Loader2,
  Pause,
  Play,
  PlugZap,
  Search,
  Users,
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

interface Workspace {
  id: string;
  name: string;
  plan: string;
  usage: { pages: number; bots: number };
  userCount: number;
}

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

const PLAN_BADGE: Record<string, string> = {
  FREE: 'bg-slate-100 text-slate-600 border-slate-200',
  STARTER: 'bg-sky-50 text-sky-700 border-sky-200',
  PROFESSIONAL: 'bg-violet-50 text-violet-700 border-violet-200',
  ENTERPRISE: 'bg-amber-50 text-amber-700 border-amber-200',
};

function PlatformBadge({ platform }: { platform: string }) {
  const config = PLATFORM_CONFIG[platform?.toUpperCase()] ?? {
    label: platform || 'Unknown',
    className: 'bg-slate-100 text-slate-600 border-slate-200',
  };
  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium border ${config.className}`}>
      <Globe className="h-3 w-3" />
      {config.label}
    </span>
  );
}

function formatConnectedAt(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return formatDistanceToNow(date, { addSuffix: true, locale: enUS });
}

function Pagination({ page, totalPages, total, onPage }: { page: number; totalPages: number; total: number; onPage: (p: number) => void }) {
  if (totalPages <= 1) {
    return <div className="px-5 py-3 text-xs text-slate-400 border-t border-slate-100">{total} total</div>;
  }
  return (
    <div className="flex items-center justify-between px-5 py-3 border-t border-slate-100">
      <span className="text-xs text-slate-400">{total} total</span>
      <div className="flex items-center gap-2">
        <button type="button" onClick={() => onPage(page - 1)} disabled={page <= 1}
          className="px-3 py-1.5 text-xs font-medium text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors disabled:opacity-30">Previous</button>
        <span className="text-xs text-slate-500">Page {page} of {totalPages}</span>
        <button type="button" onClick={() => onPage(page + 1)} disabled={page >= totalPages}
          className="px-3 py-1.5 text-xs font-medium text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors disabled:opacity-30">Next</button>
      </div>
    </div>
  );
}

// ── Master: workspace (user) list ─────────────────────────────────────────
function WorkspaceList({ onSelect }: { onSelect: (w: { id: string; name: string }) => void }) {
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [rows, setRows] = useState<Workspace[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    const t = setTimeout(() => { setSearch(searchInput.trim()); setPage(1); }, 300);
    return () => clearTimeout(t);
  }, [searchInput]);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(false);
    const params = new URLSearchParams({ page: String(page) });
    if (search) params.set('search', search);
    fetch(`/api/admin/tenants?${params.toString()}`, { cache: 'no-store' })
      .then(async (res) => {
        if (!res.ok) throw new Error();
        const data = (await res.json()) as { tenants?: Workspace[]; total?: number; totalPages?: number };
        if (!active) return;
        setRows(Array.isArray(data.tenants) ? data.tenants : []);
        setTotal(data.total ?? 0);
        setTotalPages(Math.max(1, data.totalPages ?? 1));
      })
      .catch(() => { if (active) setError(true); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [search, page, reloadKey]);

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-xl bg-slate-100 flex items-center justify-center flex-shrink-0">
          <Users className="h-5 w-5 text-slate-500" />
        </div>
        <div>
          <h2 className="text-sm font-bold text-slate-900">Workspaces</h2>
          <p className="text-xs text-slate-500 mt-0.5">Pick a user to see their pages and bots.</p>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
        <input
          type="text" value={searchInput} onChange={(e) => setSearchInput(e.target.value)}
          placeholder="Search a user / workspace by name…"
          className="w-full pl-9 pr-9 py-2 text-sm border border-slate-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:border-transparent"
        />
        {searchInput && (
          <button type="button" onClick={() => setSearchInput('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600" title="Clear">
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16 bg-white border border-slate-200 rounded-2xl shadow-sm">
          <Loader2 className="h-5 w-5 text-slate-400 animate-spin" />
        </div>
      ) : error ? (
        <div className="flex flex-col items-center justify-center py-16 bg-white border border-slate-200 rounded-2xl shadow-sm">
          <p className="text-sm font-semibold text-slate-900 mb-1">Something went wrong</p>
          <button type="button" onClick={() => setReloadKey((k) => k + 1)} className="mt-2 px-4 py-2 text-sm font-medium text-slate-600 bg-white border border-slate-200 rounded-xl hover:bg-slate-50">Retry</button>
        </div>
      ) : rows.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 bg-white border border-slate-200 rounded-2xl shadow-sm">
          <Users className="h-7 w-7 text-slate-400 mb-3" />
          <p className="text-sm font-semibold text-slate-900 mb-1">No workspaces found</p>
          <p className="text-xs text-slate-500">{search ? 'Try a different name.' : 'Workspaces will appear here.'}</p>
        </div>
      ) : (
        <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
          <ul>
            {rows.map((w) => (
              <li key={w.id}>
                <button
                  type="button"
                  onClick={() => onSelect({ id: w.id, name: w.name })}
                  className="w-full flex items-center gap-4 px-5 py-4 border-b border-slate-100 last:border-0 hover:bg-slate-50 transition-colors text-left"
                >
                  <div className="h-10 w-10 rounded-xl bg-slate-100 flex items-center justify-center flex-shrink-0">
                    <Layers className="h-5 w-5 text-slate-500" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-semibold text-slate-900 truncate">{w.name}</p>
                      <span className={`inline-flex items-center rounded-md border px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${PLAN_BADGE[w.plan] ?? PLAN_BADGE.FREE}`}>{w.plan}</span>
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {w.userCount} {w.userCount === 1 ? 'user' : 'users'} · {w.usage.pages} {w.usage.pages === 1 ? 'page' : 'pages'} · {w.usage.bots} {w.usage.bots === 1 ? 'bot' : 'bots'}
                    </p>
                  </div>
                  <ChevronRight className="h-4 w-4 text-slate-300 flex-shrink-0" />
                </button>
              </li>
            ))}
          </ul>
          <Pagination page={page} totalPages={totalPages} total={total} onPage={setPage} />
        </div>
      )}
    </div>
  );
}

// ── Detail: one workspace's pages + bots ──────────────────────────────────
function WorkspaceDetail({ tenant, onBack }: { tenant: { id: string; name: string }; onBack: () => void }) {
  const [accounts, setAccounts] = useState<AdminAccount[]>([]);
  const [bots, setBots] = useState<AdminBot[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  const [disconnectAccount, setDisconnectAccount] = useState<AdminAccount | null>(null);
  const [disconnectingId, setDisconnectingId] = useState<string | null>(null);
  const [togglingBotId, setTogglingBotId] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(false);
    Promise.all([
      fetch(`/api/admin/accounts?tenantId=${encodeURIComponent(tenant.id)}`, { cache: 'no-store' }),
      fetch(`/api/admin/bots?tenantId=${encodeURIComponent(tenant.id)}`, { cache: 'no-store' }),
    ])
      .then(async ([aRes, bRes]) => {
        if (!aRes.ok || !bRes.ok) throw new Error();
        const aData = (await aRes.json()) as { accounts?: AdminAccount[] };
        const bData = (await bRes.json()) as { bots?: AdminBot[] };
        if (!active) return;
        setAccounts(Array.isArray(aData.accounts) ? aData.accounts : []);
        setBots(Array.isArray(bData.bots) ? bData.bots : []);
      })
      .catch(() => { if (active) setError(true); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [tenant.id, reloadKey]);

  async function handleDisconnect(account: AdminAccount) {
    setDisconnectingId(account.id);
    try {
      const res = await fetch(`/api/admin/accounts/${account.id}/disconnect`, { method: 'POST' });
      if (!res.ok) { const d = await res.json().catch(() => ({})); toast.error(d.error ?? 'Failed to disconnect page'); return; }
      setAccounts((prev) => prev.map((a) => (a.id === account.id ? { ...a, isActive: false } : a)));
      setBots((prev) => prev.map((b) => (b.pageName === account.pageName ? { ...b, isActive: false } : b)));
      toast.success(`${account.pageName} disconnected`);
    } catch { toast.error('Failed to disconnect page'); } finally { setDisconnectingId(null); }
  }

  async function handleToggleBot(bot: AdminBot) {
    setTogglingBotId(bot.id);
    try {
      const res = await fetch(`/api/admin/bots/${bot.id}/toggle`, { method: 'POST' });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) { toast.error(data.error ?? 'Failed to update bot'); return; }
      const nextActive = typeof data.isActive === 'boolean' ? data.isActive : !bot.isActive;
      setBots((prev) => prev.map((b) => (b.id === bot.id ? { ...b, isActive: nextActive } : b)));
      toast.success(nextActive ? `${bot.name} activated` : `${bot.name} paused`);
    } catch { toast.error('Failed to update bot'); } finally { setTogglingBotId(null); }
  }

  return (
    <div className="space-y-8">
      {/* Header with back */}
      <div>
        <button type="button" onClick={onBack} className="inline-flex items-center gap-1 text-xs text-slate-500 hover:text-slate-700 mb-2">
          <ChevronLeft className="h-3.5 w-3.5" />
          Workspaces
        </button>
        <h2 className="text-lg font-bold text-slate-900">{tenant.name}</h2>
        <p className="text-xs text-slate-500 mt-0.5">Pages and bots owned by this workspace.</p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16 bg-white border border-slate-200 rounded-2xl shadow-sm">
          <Loader2 className="h-5 w-5 text-slate-400 animate-spin" />
        </div>
      ) : error ? (
        <div className="flex flex-col items-center justify-center py-16 bg-white border border-slate-200 rounded-2xl shadow-sm">
          <p className="text-sm font-semibold text-slate-900 mb-1">Something went wrong</p>
          <button type="button" onClick={() => setReloadKey((k) => k + 1)} className="mt-2 px-4 py-2 text-sm font-medium text-slate-600 bg-white border border-slate-200 rounded-xl hover:bg-slate-50">Retry</button>
        </div>
      ) : (
        <>
          {/* Pages */}
          <section>
            <div className="flex items-center gap-2 mb-3">
              <PlugZap className="h-4 w-4 text-slate-500" />
              <h3 className="text-sm font-bold text-slate-900">Connected pages ({accounts.length})</h3>
            </div>
            {accounts.length === 0 ? (
              <div className="py-10 bg-white border border-slate-200 rounded-2xl shadow-sm text-center text-xs text-slate-500">No pages connected.</div>
            ) : (
              <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-slate-200 bg-slate-50">
                        <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Page</th>
                        <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Platform</th>
                        <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Webhook</th>
                        <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Status</th>
                        <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Connected</th>
                        <th className="text-right px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {accounts.map((account) => (
                        <tr key={account.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50/80 transition-colors">
                          <td className="px-5 py-3.5">
                            <div className="flex items-center gap-3">
                              <UserAvatar name={account.pageName} image={account.pictureUrl} size={36} />
                              <p className="text-sm font-medium text-slate-900 truncate max-w-[220px]">{account.pageName}</p>
                            </div>
                          </td>
                          <td className="px-5 py-3.5"><PlatformBadge platform={account.platform} /></td>
                          <td className="px-5 py-3.5">
                            {account.webhookSubscribed ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200"><Webhook className="h-3 w-3" />Subscribed</span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-500 border border-slate-200"><Webhook className="h-3 w-3" />Not subscribed</span>
                            )}
                          </td>
                          <td className="px-5 py-3.5">
                            {account.isActive ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200"><CheckCircle2 className="h-3 w-3" />Active</span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-500 border border-slate-200"><Link2Off className="h-3 w-3" />Disconnected</span>
                            )}
                          </td>
                          <td className="px-5 py-3.5 text-xs text-slate-500 whitespace-nowrap">{formatConnectedAt(account.connectedAt)}</td>
                          <td className="px-5 py-3.5">
                            <div className="flex items-center justify-end">
                              <button type="button" onClick={() => setDisconnectAccount(account)} disabled={!account.isActive || disconnectingId === account.id}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-red-600 bg-white border border-red-200 rounded-lg hover:bg-red-50 transition-colors disabled:opacity-30 disabled:hover:bg-white"
                                title={account.isActive ? 'Disconnect page' : 'Already disconnected'}>
                                {disconnectingId === account.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Link2Off className="h-3.5 w-3.5" />}Disconnect
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
            <div className="flex items-center gap-2 mb-3">
              <BotIcon className="h-4 w-4 text-slate-500" />
              <h3 className="text-sm font-bold text-slate-900">Bots ({bots.length})</h3>
            </div>
            {bots.length === 0 ? (
              <div className="py-10 bg-white border border-slate-200 rounded-2xl shadow-sm text-center text-xs text-slate-500">No bots yet.</div>
            ) : (
              <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-slate-200 bg-slate-50">
                        <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Bot</th>
                        <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Page</th>
                        <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Model</th>
                        <th className="text-center px-3 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Comments</th>
                        <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Status</th>
                        <th className="text-right px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {bots.map((bot) => (
                        <tr key={bot.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50/80 transition-colors">
                          <td className="px-5 py-3.5"><p className="text-sm font-medium text-slate-900 truncate max-w-[220px]">{bot.name}</p></td>
                          <td className="px-5 py-3.5">
                            <div className="flex items-center gap-2">
                              <PlatformBadge platform={bot.platform} />
                              <span className="text-xs text-slate-500 truncate max-w-[140px]">{bot.pageName}</span>
                            </div>
                          </td>
                          <td className="px-5 py-3.5">
                            {bot.aiModel ? (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-mono font-medium bg-slate-100 text-slate-600 border border-slate-200">{bot.aiModel}</span>
                            ) : (<span className="text-xs text-slate-400">—</span>)}
                          </td>
                          <td className="px-3 py-3.5 text-center text-slate-600">{bot.commentCount}</td>
                          <td className="px-5 py-3.5">
                            {bot.isActive ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200"><CheckCircle2 className="h-3 w-3" />Active</span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-amber-50 text-amber-700 border border-amber-200"><Pause className="h-3 w-3" />Paused</span>
                            )}
                          </td>
                          <td className="px-5 py-3.5">
                            <div className="flex items-center justify-end">
                              <button type="button" onClick={() => void handleToggleBot(bot)} disabled={togglingBotId === bot.id}
                                className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-white border rounded-lg transition-colors disabled:opacity-40 ${bot.isActive ? 'text-amber-600 border-amber-200 hover:bg-amber-50' : 'text-emerald-600 border-emerald-200 hover:bg-emerald-50'}`}
                                title={bot.isActive ? 'Pause bot' : 'Activate bot'}>
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
              </div>
            )}
          </section>
        </>
      )}

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
            <button type="button"
              onClick={() => { const a = disconnectAccount; setDisconnectAccount(null); if (a) void handleDisconnect(a); }}
              className="inline-flex items-center justify-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors">
              <Link2Off className="h-4 w-4" />Disconnect page
            </button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

export function PagesAndBotsPanel() {
  const [selected, setSelected] = useState<{ id: string; name: string } | null>(null);
  if (!selected) return <WorkspaceList onSelect={setSelected} />;
  return <WorkspaceDetail tenant={selected} onBack={() => setSelected(null)} />;
}
