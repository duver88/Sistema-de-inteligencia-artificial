'use client';

import { useEffect, useState } from 'react';
import { Loader2, ShieldCheck, X } from 'lucide-react';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import { dateInputToUtcEndOfDay, isoToDateInput } from './access';
import type { AdminUser } from './types';

interface EditUserDialogProps {
  user: AdminUser | null;
  currentUserId: string;
  onOpenChange: (open: boolean) => void;
  onUpdated: (user: AdminUser) => void;
}

export function EditUserDialog({ user, currentUserId, onOpenChange, onUpdated }: EditUserDialogProps) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [isAdmin, setIsAdmin] = useState(false);
  // yyyy-MM-dd from the date input; '' = unlimited access
  const [expiresOn, setExpiresOn] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Sync form fields when a user is selected
  useEffect(() => {
    if (user) {
      setName(user.name ?? '');
      setEmail(user.email ?? '');
      setIsAdmin(user.isSuperAdmin);
      setExpiresOn(user.accessExpiresAt ? isoToDateInput(user.accessExpiresAt) : '');
    }
  }, [user]);

  const isSelf = user?.id === currentUserId;
  // Admins created as platform administrators have no tenant. Demoting them
  // would leave an account with neither tenant nor admin rights — unusable —
  // so the PATCH endpoint rejects it and the toggle is locked here too.
  const isTenantlessAdmin = !!user && user.isSuperAdmin && !user.tenant;
  const adminToggleLocked = isSelf || isTenantlessAdmin;
  const adminToggleLockReason = isSelf
    ? 'You cannot change your own admin role'
    : 'This administrator has no tenant and cannot be demoted to a regular user';
  // The PATCH endpoint rejects expiration changes on yourself, and
  // administrators never expire. Lock the field based on the PENDING role
  // toggle (not the saved one): promoting locks it so a hidden expiration
  // date can never be stored on an admin, and demoting unlocks it so the
  // date can be reviewed/cleared atomically with the demotion.
  const expiryLocked = isSelf || isAdmin;
  const expiryLockReason = isSelf
    ? 'You cannot change your own access expiration'
    : 'Administrator accounts never expire';

  const canSubmit = name.trim().length > 0 && email.trim().length > 0;

  async function handleSubmit() {
    if (!user || !canSubmit || submitting) return;
    setSubmitting(true);
    try {
      const body: {
        name: string;
        email: string;
        isSuperAdmin?: boolean;
        accessExpiresAt?: string | null;
      } = { name: name.trim(), email: email.trim() };

      // Only send fields the endpoint allows us to change AND that actually
      // changed — sending your own isSuperAdmin (even unchanged) is a 400.
      if (!isSelf && isAdmin !== user.isSuperAdmin) {
        body.isSuperAdmin = isAdmin;
      }
      if (!expiryLocked) {
        const original = user.accessExpiresAt ? isoToDateInput(user.accessExpiresAt) : '';
        if (expiresOn !== original) {
          body.accessExpiresAt = expiresOn ? dateInputToUtcEndOfDay(expiresOn) : null;
        }
      }

      const res = await fetch(`/api/admin/users/${user.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(data.error ?? 'Failed to update user');
        return;
      }
      toast.success('User updated');
      onUpdated({ ...user, ...data.user } as AdminUser);
      onOpenChange(false);
    } catch {
      toast.error('Failed to update user');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={!!user} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md bg-white">
        <DialogHeader>
          <DialogTitle>Edit user</DialogTitle>
          <DialogDescription>
            Update the user&apos;s name, email, role and access expiration.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">
              Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Full name"
              className="w-full text-sm border border-slate-200 rounded-xl px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="user@example.com"
              autoComplete="off"
              className="w-full text-sm border border-slate-200 rounded-xl px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:border-transparent"
            />
          </div>
          <div
            className="flex items-center justify-between gap-3 border border-slate-200 rounded-xl px-3 py-2.5"
            title={adminToggleLocked ? adminToggleLockReason : undefined}
          >
            <div className="flex items-center gap-2 min-w-0">
              <ShieldCheck className="h-4 w-4 text-purple-600 flex-shrink-0" />
              <div className="min-w-0">
                <p className="text-sm font-medium text-slate-900">Administrator</p>
                <p className="text-xs text-slate-400">
                  Full platform access. Administrators never expire.
                </p>
              </div>
            </div>
            <Switch
              checked={isAdmin}
              onCheckedChange={(checked) => setIsAdmin(checked)}
              disabled={adminToggleLocked}
              aria-label="Administrator"
            />
          </div>
          <div title={expiryLocked ? expiryLockReason : undefined}>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">
              Access expires on
            </label>
            <div className="flex gap-2">
              <input
                type="date"
                value={expiresOn}
                onChange={(e) => setExpiresOn(e.target.value)}
                disabled={expiryLocked}
                className="flex-1 text-sm border border-slate-200 rounded-xl px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:border-transparent disabled:opacity-50 disabled:bg-slate-50"
              />
              <button
                type="button"
                onClick={() => setExpiresOn('')}
                disabled={expiryLocked || !expiresOn}
                className="px-3 py-2 text-slate-500 hover:text-red-600 hover:bg-red-50 border border-slate-200 rounded-xl transition-colors disabled:opacity-30 disabled:pointer-events-none"
                title="Clear expiration date"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <p className="mt-1.5 text-xs text-slate-400">
              {expiryLocked ? expiryLockReason : 'Leave empty for unlimited access.'}
            </p>
          </div>
        </div>

        <DialogFooter>
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            disabled={submitting}
            className="px-4 py-2 text-sm font-medium text-slate-600 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => void handleSubmit()}
            disabled={!canSubmit || submitting}
            className="flex items-center justify-center gap-1.5 px-4 py-2 text-sm font-bold rounded-xl transition-all disabled:opacity-50"
            style={{ background: 'linear-gradient(135deg, #00C4D4, #00E5FF)', color: '#0a1628' }}
          >
            {submitting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
            Save changes
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
