'use client';

import { useState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { PageHeader } from '@/components/layout/PageHeader';
import { AccountListItem } from '@/components/accounts/AccountListItem';
import { ConnectAccountCard } from '@/components/accounts/ConnectAccountCard';
import { Link as LinkIcon } from 'lucide-react';
import { toast } from 'sonner';

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
  unexpected: 'An unexpected error occurred. Please try again.',
};

export function AccountsClient({ initialAccounts }: { initialAccounts: Account[] }) {
  const [accounts, setAccounts] = useState<Account[]>(initialAccounts);
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

  return (
    <div>
      <PageHeader
        title="Connected Accounts"
        description="Manage your Facebook pages and Instagram accounts."
        action={<ConnectAccountCard onConnected={handleConnected} />}
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
    </div>
  );
}
