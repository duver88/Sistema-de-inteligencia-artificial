'use client';

import { useEffect, useState } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { enUS } from 'date-fns/locale';
import {
  Ban,
  Bot as BotIcon,
  CalendarClock,
  CheckCircle2,
  Globe,
  KeyRound,
  Loader2,
  RefreshCw,
  ShieldCheck,
  XCircle,
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { formatAccessDate, isAccessExpired } from './access';
import type { AdminUser, AdminUserDetails } from './types';

const PLAN_CONFIG: Record<string, { label: string; className: string }> = {
  FREE:         { label: 'Free',         className: 'bg-slate-100 text-slate-600' },
  STARTER:      { label: 'Starter',      className: 'bg-blue-50 text-blue-700' },
  PROFESSIONAL: { label: 'Professional', className: 'bg-cyan-50 text-cyan-700' },
  ENTERPRISE:   { label: 'Enterprise',   className: 'bg-purple-50 text-purple-700' },
};

interface UserDetailsDialogProps {
  user: AdminUser | null;
  onOpenChange: (open: boolean) => void;
}

function relativeDate(value: string | null): string {
  if (!value) return 'Never';
  return formatDistanceToNow(new Date(value), { addSuffix: true, locale: enUS });
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">
      {children}
    </p>
  );
}

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3 py-1">
      <span className="text-xs text-slate-500">{label}</span>
      <span className="text-xs text-slate-700 font-medium text-right">{value}</span>
    </div>
  );
}

export function UserDetailsDialog({ user, onOpenChange }: UserDetailsDialogProps) {
  const [details, setDetails] = useState<AdminUserDetails | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Bumped by the Retry button to re-run the fetch effect
  const [attempt, setAttempt] = useState(0);

  const userId = user?.id ?? null;

  useEffect(() => {
    if (!userId) {
      setDetails(null);
      setError(null);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(null);
    setDetails(null);
    (async () => {
      try {
        const res = await fetch(`/api/admin/users/${userId}`, { cache: 'no-store' });
        const data = await res.json().catch(() => ({}));
        if (cancelled) return;
        if (!res.ok) {
          setError(data.error ?? 'Failed to load user details');
          return;
        }
        setDetails(data as AdminUserDetails);
      } catch {
        if (!cancelled) setError('Failed to load user details');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [userId, attempt]);

  const plan = details?.tenant
    ? (PLAN_CONFIG[details.tenant.plan] ?? PLAN_CONFIG.FREE)
    : null;

  return (
    <Dialog open={!!user} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg bg-white">
        <DialogHeader>
          <DialogTitle>User details</DialogTitle>
          <DialogDescription>
            Read-only overview of {user?.name ?? user?.email ?? 'this user'}.
          </DialogDescription>
        </DialogHeader>

        {loading && (
          <div className="flex flex-col items-center justify-center py-12">
            <Loader2 className="h-5 w-5 text-slate-400 animate-spin mb-2" />
            <p className="text-xs text-slate-500">Loading details…</p>
          </div>
        )}

        {!loading && error && (
          <div className="flex flex-col items-center justify-center py-12">
            <p className="text-sm font-semibold text-slate-900 mb-1">Something went wrong</p>
            <p className="text-xs text-slate-500 mb-4">{error}</p>
            <button
              type="button"
              onClick={() => setAttempt((n) => n + 1)}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-slate-600 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              Retry
            </button>
          </div>
        )}

        {!loading && !error && details && (
          <div className="space-y-5 max-h-[65vh] overflow-y-auto pr-1">
            {/* User info */}
            <section>
              <SectionTitle>User info</SectionTitle>
              <div className="border border-slate-200 rounded-xl px-3 py-2">
                <InfoRow label="Name" value={details.user.name ?? '—'} />
                <InfoRow label="Email" value={details.user.email ?? '—'} />
                <InfoRow
                  label="Status"
                  value={
                    details.user.status === 'SUSPENDED' ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-red-50 text-red-700 border border-red-200">
                        <Ban className="h-3 w-3" />
                        Suspended
                      </span>
                    ) : isAccessExpired(details.user) ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-amber-50 text-amber-700 border border-amber-200">
                        <CalendarClock className="h-3 w-3" />
                        Expired
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                        <CheckCircle2 className="h-3 w-3" />
                        Active
                      </span>
                    )
                  }
                />
                <InfoRow
                  label="Role"
                  value={
                    details.user.isSuperAdmin ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-purple-50 text-purple-700 border border-purple-200">
                        <ShieldCheck className="h-3 w-3" />
                        Administrator
                      </span>
                    ) : (
                      'User'
                    )
                  }
                />
                <InfoRow
                  label="Access until"
                  value={
                    !details.user.isSuperAdmin && details.user.accessExpiresAt
                      ? formatAccessDate(details.user.accessExpiresAt)
                      : 'No limit'
                  }
                />
                <InfoRow
                  label="Must change password"
                  value={details.user.mustChangePassword ? 'Yes' : 'No'}
                />
                <InfoRow label="Last login" value={relativeDate(details.user.lastLoginAt)} />
                <InfoRow label="Created" value={relativeDate(details.user.createdAt)} />
              </div>
            </section>

            {/* API & plan */}
            <section>
              <SectionTitle>API &amp; plan</SectionTitle>
              <div className="border border-slate-200 rounded-xl px-3 py-2">
                {details.tenant ? (
                  <>
                    <InfoRow label="Tenant" value={details.tenant.name} />
                    <InfoRow
                      label="Plan"
                      value={
                        plan ? (
                          <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-medium ${plan.className}`}>
                            {plan.label}
                          </span>
                        ) : (
                          '—'
                        )
                      }
                    />
                    <InfoRow
                      label="OpenAI API key"
                      value={
                        details.tenant.openaiKeySet ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                            <KeyRound className="h-3 w-3" />
                            Configured
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-slate-100 text-slate-500 border border-slate-200">
                            <XCircle className="h-3 w-3" />
                            Not configured
                          </span>
                        )
                      }
                    />
                    {details.tenant.openaiKeySet && (
                      <InfoRow
                        label="Key set"
                        value={relativeDate(details.tenant.openaiKeySetAt)}
                      />
                    )}
                  </>
                ) : (
                  <p className="text-xs text-slate-400 py-1">No tenant assigned.</p>
                )}
              </div>
            </section>

            {/* Connected accounts */}
            <section>
              <SectionTitle>Connected accounts ({details.accounts.length})</SectionTitle>
              {details.accounts.length === 0 ? (
                <p className="text-xs text-slate-400 border border-slate-200 rounded-xl px-3 py-3">
                  No connected accounts.
                </p>
              ) : (
                <div className="space-y-2">
                  {details.accounts.map((account) => (
                    <div
                      key={account.id}
                      className="flex items-center gap-3 border border-slate-200 rounded-xl px-3 py-2"
                    >
                      {account.pictureUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={account.pictureUrl}
                          alt=""
                          className="h-8 w-8 rounded-full object-cover flex-shrink-0"
                        />
                      ) : (
                        <div className="h-8 w-8 rounded-full bg-slate-100 flex items-center justify-center flex-shrink-0">
                          <Globe className="h-4 w-4 text-slate-400" />
                        </div>
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-slate-900 truncate">
                          {account.pageName}
                        </p>
                        <p className="text-[10px] text-slate-400">
                          {account.platform === 'INSTAGRAM' ? 'Instagram' : 'Facebook'}
                          {' · connected '}
                          {relativeDate(account.connectedAt)}
                        </p>
                      </div>
                      <div className="flex items-center gap-1 flex-shrink-0">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${
                            account.isActive
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : 'bg-slate-100 text-slate-500 border border-slate-200'
                          }`}
                        >
                          {account.isActive ? 'Active' : 'Inactive'}
                        </span>
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${
                            account.webhookSubscribed
                              ? 'bg-cyan-50 text-cyan-700 border border-cyan-200'
                              : 'bg-amber-50 text-amber-700 border border-amber-200'
                          }`}
                        >
                          {account.webhookSubscribed ? 'Webhook' : 'No webhook'}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>

            {/* Bots */}
            <section>
              <SectionTitle>Bots ({details.bots.length})</SectionTitle>
              {details.bots.length === 0 ? (
                <p className="text-xs text-slate-400 border border-slate-200 rounded-xl px-3 py-3">
                  No bots.
                </p>
              ) : (
                <div className="space-y-2">
                  {details.bots.map((bot) => (
                    <div
                      key={bot.id}
                      className="flex items-center gap-3 border border-slate-200 rounded-xl px-3 py-2"
                    >
                      <div className="h-8 w-8 rounded-full bg-cyan-50 flex items-center justify-center flex-shrink-0">
                        <BotIcon className="h-4 w-4 text-cyan-600" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-slate-900 truncate">{bot.name}</p>
                        <p className="text-[10px] text-slate-400 truncate">
                          {bot.pageName} · {bot.aiModel} · {bot.commentCount}{' '}
                          {bot.commentCount === 1 ? 'comment' : 'comments'}
                        </p>
                      </div>
                      <span
                        className={`flex-shrink-0 px-2 py-0.5 rounded-full text-[10px] font-medium ${
                          bot.isActive
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : 'bg-slate-100 text-slate-500 border border-slate-200'
                        }`}
                      >
                        {bot.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
