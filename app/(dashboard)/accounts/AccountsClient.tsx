'use client';

import { useState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { PageHeader } from '@/components/layout/PageHeader';
import { AccountListItem } from '@/components/accounts/AccountListItem';
import { ConnectAccountCard } from '@/components/accounts/ConnectAccountCard';
import { Link as LinkIcon, Loader2, Link2Off } from 'lucide-react';
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

interface Account {
  id: string;
  platform: 'FACEBOOK' | 'INSTAGRAM';
  pageName: string;
  pageId: string;
  pictureUrl: string | null;
  connectedAt: string;
  tokenExpiresAt: string | null;
  isActive: boolean;
  webhookSubscribed: boolean;
}

const ERROR_MESSAGES: Record<string, string> = {
  access_denied: 'Access denied. No accounts were connected.',
  missing_params: 'There was an error during the connection process.',
  invalid_state: 'Security error. Please try again.',
  token_exchange: 'Failed to retrieve the Facebook token.',
  server_config: 'Server configuration error.',
  no_pages: 'No pages were connected. Make sure you selected a Facebook Page you administer.',
  plan_limit: 'You have reached your plan’s page limit. Upgrade your plan or disconnect a page to add more.',
  unexpected: 'An unexpected error occurred. Please try again.',
};

export function AccountsClient({ initialAccounts }: { initialAccounts: Account[] }) {
  const [accounts, setAccounts] = useState<Account[]>(initialAccounts);
  const [confirmDisconnectAll, setConfirmDisconnectAll] = useState(false);
  const [disconnectingAll, setDisconnectingAll] = useState(false);
  const searchParams = useSearchParams();
  const router = useRouter();

  useEffect(() => {
    const success = searchParams.get('success');
    const error = searchParams.get('error');

    if (success === 'true') {
      const count = parseInt(searchParams.get('count') ?? '0', 10) || 0;
      toast.success(
        count === 1
          ? '1 page connected successfully.'
          : `${count} pages connected successfully.`
      );
      router.replace('/accounts');
    } else if (error) {
      const msg = ERROR_MESSAGES[error] ?? 'Failed to connect the account.';
      toast.error(msg);
      router.replace('/accounts');
    }
  }, [searchParams, router]);

  function handleDisconnect(id: string) {
    setAccounts(prev => prev.filter(a => a.id !== id));
  }

  function handleConnected() {
    window.location.reload();
  }

  async function handleDisconnectAll() {
    setDisconnectingAll(true);
    try {
      const res = await fetch('/api/accounts/disconnect-all', { method: 'POST' });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(data.error ?? 'Failed to disconnect accounts');
        return;
      }
      setAccounts([]);
      setConfirmDisconnectAll(false);
      toast.success(
        data.disconnected === 1
          ? '1 page disconnected'
          : `${data.disconnected ?? 0} pages disconnected`,
      );
    } catch {
      toast.error('Failed to disconnect accounts');
    } finally {
      setDisconnectingAll(false);
    }
  }

  return (
    <div>
      <PageHeader
        title="Connected Accounts"
        description="Manage your Facebook pages and Instagram accounts."
        action={
          <div className="flex items-center gap-2">
            {accounts.length > 0 && (
              <button
                type="button"
                onClick={() => setConfirmDisconnectAll(true)}
                disabled={disconnectingAll}
                className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-red-600 bg-white border border-red-200 rounded-xl hover:bg-red-50 transition-colors disabled:opacity-50"
              >
                {disconnectingAll ? <Loader2 className="h-4 w-4 animate-spin" /> : <Link2Off className="h-4 w-4" />}
                Disconnect all
              </button>
            )}
            <ConnectAccountCard onConnected={handleConnected} />
          </div>
        }
      />

      {accounts.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 bg-white border border-slate-200 rounded-2xl shadow-sm">
          <div className="h-16 w-16 bg-cyan-50 rounded-2xl flex items-center justify-center mb-5">
            <LinkIcon className="h-8 w-8 text-cyan-500" />
          </div>
          <h3 className="text-base font-semibold text-slate-900 mb-2">
            No connected accounts
          </h3>
          <p className="text-sm text-slate-500 text-center max-w-xs mb-7">
            Connect your Facebook and Instagram pages to start managing
            comments with AI.
          </p>
          <ConnectAccountCard onConnected={handleConnected} />
        </div>
      ) : (
        <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50">
                <th className="text-left px-5 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wide">
                  Account
                </th>
                <th className="text-left px-5 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wide">
                  Platform
                </th>
                <th className="text-left px-5 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wide">
                  Connected
                </th>
                <th className="text-left px-5 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wide">
                  Status
                </th>
                <th className="px-5 py-3.5" />
              </tr>
            </thead>
            <tbody>
              {accounts.map(account => (
                <AccountListItem
                  key={account.id}
                  account={account}
                  onDisconnect={handleDisconnect}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Disconnect-all confirmation */}
      <AlertDialog open={confirmDisconnectAll} onOpenChange={(open) => { if (!open && !disconnectingAll) setConfirmDisconnectAll(false); }}>
        <AlertDialogContent className="bg-white">
          <AlertDialogHeader>
            <AlertDialogTitle>Disconnect all pages?</AlertDialogTitle>
            <AlertDialogDescription>
              This disconnects every connected page at once, stops their webhooks and pauses all bots.
              Your bot configuration and comment history are kept, and you can reconnect any page later.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={disconnectingAll}>Cancel</AlertDialogCancel>
            <button
              type="button"
              onClick={() => void handleDisconnectAll()}
              disabled={disconnectingAll}
              className="inline-flex items-center justify-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors disabled:opacity-50"
            >
              {disconnectingAll ? <Loader2 className="h-4 w-4 animate-spin" /> : <Link2Off className="h-4 w-4" />}
              Disconnect all
            </button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
