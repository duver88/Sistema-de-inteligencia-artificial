'use client';

import { useState } from 'react';
import { FacebookIcon } from '@/components/icons/FacebookIcon';
import { InstagramIcon } from '@/components/icons/InstagramIcon';
import { AlertTriangle, CheckCircle2, Trash2, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

interface AccountListItemProps {
  account: {
    id: string;
    platform: 'FACEBOOK' | 'INSTAGRAM';
    pageName: string;
    pageId: string;
    pictureUrl: string | null;
    connectedAt: string;
    tokenExpiresAt: string | null;
    isActive: boolean;
  };
  onDisconnect: (id: string) => void;
}

export function AccountListItem({ account, onDisconnect }: AccountListItemProps) {
  const [disconnecting, setDisconnecting] = useState(false);

  const PlatformIcon = account.platform === 'FACEBOOK' ? FacebookIcon : InstagramIcon;
  const platformColor = account.platform === 'FACEBOOK' ? 'text-blue-600' : 'text-pink-600';

  // Check if token is expiring soon (within 7 days)
  const isExpiringSoon =
    account.tokenExpiresAt &&
    new Date(account.tokenExpiresAt).getTime() - Date.now() < 7 * 24 * 60 * 60 * 1000;
  const isExpired =
    account.tokenExpiresAt && new Date(account.tokenExpiresAt) < new Date();

  async function handleDisconnect() {
    setDisconnecting(true);
    try {
      const res = await fetch(`/api/accounts/${account.id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to disconnect');
      toast.success(`${account.pageName} disconnected`);
      onDisconnect(account.id);
    } catch {
      toast.error('Failed to disconnect account. Please try again.');
    } finally {
      setDisconnecting(false);
    }
  }

  return (
    <tr className="border-b border-slate-100 hover:bg-slate-50">
      <td className="px-4 py-3">
        <div className="flex items-center gap-3">
          {account.pictureUrl ? (
            <img
              src={account.pictureUrl}
              alt={account.pageName}
              className="h-9 w-9 rounded-full object-cover flex-shrink-0"
            />
          ) : (
            <div className="h-9 w-9 rounded-full bg-slate-100 flex items-center justify-center flex-shrink-0">
              <PlatformIcon className={`h-4 w-4 ${platformColor}`} />
            </div>
          )}
          <div>
            <p className="text-sm font-medium text-slate-900">{account.pageName}</p>
            <p className="text-xs text-slate-400">{account.pageId}</p>
          </div>
        </div>
      </td>
      <td className="px-4 py-3">
        <div className="flex items-center gap-1.5">
          <PlatformIcon className={`h-4 w-4 ${platformColor}`} />
          <span className="text-sm text-slate-600 capitalize">
            {account.platform.toLowerCase()}
          </span>
        </div>
      </td>
      <td className="px-4 py-3 text-sm text-slate-500">
        {new Date(account.connectedAt).toLocaleDateString()}
      </td>
      <td className="px-4 py-3">
        {isExpired ? (
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-red-50 text-red-700 border border-red-200">
            <AlertTriangle className="h-3 w-3" />
            Token Expired
          </span>
        ) : isExpiringSoon ? (
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-amber-50 text-amber-700 border border-amber-200">
            <AlertTriangle className="h-3 w-3" />
            Expiring Soon
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
            <CheckCircle2 className="h-3 w-3" />
            Active
          </span>
        )}
      </td>
      <td className="px-4 py-3 text-right">
        <AlertDialog>
          <AlertDialogTrigger
            disabled={disconnecting}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
          >
            {disconnecting ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Trash2 className="h-3.5 w-3.5" />
            )}
            Disconnect
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Disconnect {account.pageName}?</AlertDialogTitle>
              <AlertDialogDescription>
                This will deactivate the account and pause its bot. The bot configuration
                and comment history will be preserved. You can reconnect at any time.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDisconnect}
                className="bg-red-600 hover:bg-red-700 text-white"
              >
                Disconnect
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </td>
    </tr>
  );
}
