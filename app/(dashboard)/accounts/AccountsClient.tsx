'use client';

import { useState } from 'react';
import { PageHeader } from '@/components/layout/PageHeader';
import { AccountListItem } from '@/components/accounts/AccountListItem';
import { ConnectAccountCard } from '@/components/accounts/ConnectAccountCard';
import { Link as LinkIcon } from 'lucide-react';

interface Account {
  id: string;
  platform: 'FACEBOOK' | 'INSTAGRAM';
  pageName: string;
  pageId: string;
  pictureUrl: string | null;
  connectedAt: string;
  tokenExpiresAt: string | null;
  isActive: boolean;
}

export function AccountsClient({ initialAccounts }: { initialAccounts: Account[] }) {
  const [accounts, setAccounts] = useState<Account[]>(initialAccounts);

  function handleDisconnect(id: string) {
    setAccounts(prev => prev.filter(a => a.id !== id));
  }

  function handleConnected() {
    // Reload the page to show new accounts
    window.location.reload();
  }

  return (
    <div>
      <PageHeader
        title="Connected Accounts"
        description="Manage your Facebook Pages and Instagram accounts."
        action={<ConnectAccountCard onConnected={handleConnected} />}
      />

      {accounts.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20">
          <div className="h-14 w-14 bg-slate-100 rounded-xl flex items-center justify-center mb-4">
            <LinkIcon className="h-7 w-7 text-slate-400" />
          </div>
          <h3 className="text-base font-semibold text-slate-900 mb-1">
            No accounts connected
          </h3>
          <p className="text-sm text-slate-500 text-center max-w-xs mb-6">
            Connect your Facebook Pages and Instagram accounts to start managing
            comments with AI.
          </p>
          <ConnectAccountCard onConnected={handleConnected} />
        </div>
      ) : (
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50">
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-600 uppercase tracking-wide">
                  Account
                </th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-600 uppercase tracking-wide">
                  Platform
                </th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-600 uppercase tracking-wide">
                  Connected
                </th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-600 uppercase tracking-wide">
                  Status
                </th>
                <th className="px-4 py-3" />
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
