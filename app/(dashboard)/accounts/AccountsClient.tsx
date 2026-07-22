'use client';

import { useState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { PageHeader } from '@/components/layout/PageHeader';
import { AccountListItem } from '@/components/accounts/AccountListItem';
import { ConnectAccountCard } from '@/components/accounts/ConnectAccountCard';
import { Loader2, Link2Off } from 'lucide-react';
import { toast } from 'sonner';
import { FacebookIcon } from '@/components/icons/FacebookIcon';
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
        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-8 sm:p-10 max-w-2xl mx-auto">
          <div className="text-center">
            <div className="h-14 w-14 rounded-2xl flex items-center justify-center mx-auto mb-4" style={{ backgroundColor: '#1877F2' }}>
              <FacebookIcon className="h-7 w-7 text-white" />
            </div>
            <h3 className="text-lg font-bold text-slate-900 mb-1.5">Connect a Facebook Page</h3>
            <p className="text-sm text-slate-500 max-w-md mx-auto">
              Link a Page you manage so LionsCore can reply to and moderate its comments with AI.
            </p>
          </div>

          {/* Steps */}
          <ol className="mt-7 space-y-3 max-w-md mx-auto">
            {[
              'Click "Continue with Facebook" and choose the Page(s) you manage.',
              'Approve the permissions so LionsCore can read and reply to comments.',
              'Your Page appears here and the AI starts moderating based on your rules.',
            ].map((step, i) => (
              <li key={i} className="flex items-start gap-3">
                <span className="flex-shrink-0 h-6 w-6 rounded-full bg-cyan-50 text-cyan-700 text-xs font-bold flex items-center justify-center border border-cyan-200">
                  {i + 1}
                </span>
                <span className="text-sm text-slate-600 pt-0.5">{step}</span>
              </li>
            ))}
          </ol>

          {/* Permission disclosure — "explain why" (Meta guidance) */}
          <div className="mt-6 rounded-xl bg-slate-50 border border-slate-200 px-4 py-3 max-w-md mx-auto">
            <p className="text-xs text-slate-500 leading-relaxed">
              LionsCore requests permission to read and manage comments on the Pages you connect, so it
              can reply to questions and remove spam on your behalf. <span className="font-semibold text-slate-600">You must be an admin of the Page.</span>{' '}
              We never post anything outside the rules you configure, and you can disconnect a Page at any time.
            </p>
          </div>

          <div className="mt-6 flex justify-center">
            <ConnectAccountCard onConnected={handleConnected} />
          </div>

          {/* Legal links (Meta requirement) */}
          <p className="mt-5 text-center text-xs text-slate-400">
            By connecting, you agree to our{' '}
            <a href="/terms" target="_blank" rel="noopener noreferrer" className="text-slate-500 hover:text-cyan-600 underline">Terms</a>{' '}
            and{' '}
            <a href="/privacy" target="_blank" rel="noopener noreferrer" className="text-slate-500 hover:text-cyan-600 underline">Privacy Policy</a>.
            {' '}Learn how to{' '}
            <a href="/data-deletion" target="_blank" rel="noopener noreferrer" className="text-slate-500 hover:text-cyan-600 underline">delete your data</a>.
          </p>
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
