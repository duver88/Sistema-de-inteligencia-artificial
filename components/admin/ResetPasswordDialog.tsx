'use client';

import { useEffect, useState } from 'react';
import { Check, Copy, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { PasswordInput, generateTempPassword } from './PasswordInput';
import type { AdminUser } from './types';

interface ResetPasswordDialogProps {
  user: AdminUser | null;
  onOpenChange: (open: boolean) => void;
  onReset: (user: AdminUser) => void;
}

export function ResetPasswordDialog({ user, onOpenChange, onReset }: ResetPasswordDialogProps) {
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  // After a successful reset, keep the dialog open on a confirmation step
  // showing the temporary password one last time — closing immediately
  // would destroy the only copy of the credential.
  const [resetPassword, setResetPassword] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // Generate a fresh random password each time the modal opens
  useEffect(() => {
    if (user) {
      setPassword(generateTempPassword());
      setResetPassword(null);
      setCopied(false);
    }
  }, [user]);

  const canSubmit = password.length >= 10;

  async function handleSubmit() {
    if (!user || !canSubmit || submitting) return;
    setSubmitting(true);
    try {
      const res = await fetch(`/api/admin/users/${user.id}/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(data.error ?? 'Failed to reset password');
        return;
      }
      toast.success('Password reset');
      onReset({ ...user, mustChangePassword: true });
      setResetPassword(password);
    } catch {
      toast.error('Failed to reset password');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleCopyPassword() {
    if (!resetPassword) return;
    try {
      await navigator.clipboard.writeText(resetPassword);
      setCopied(true);
      toast.success('Password copied to clipboard');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('Failed to copy password');
    }
  }

  return (
    <Dialog open={!!user} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md bg-white">
        {resetPassword ? (
          <>
            <DialogHeader>
              <DialogTitle>Password reset</DialogTitle>
              <DialogDescription>
                Copy the temporary password now and send it to{' '}
                <span className="font-medium text-slate-700">
                  {user?.name ?? user?.email ?? 'the user'}
                </span>
                {' '}— it is never shown again after you close this dialog.
              </DialogDescription>
            </DialogHeader>

            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">
                Temporary password
              </p>
              <div className="flex gap-2">
                <code className="flex-1 text-sm font-mono text-slate-900 border border-slate-200 rounded-xl px-3 py-2 bg-slate-50 break-all">
                  {resetPassword}
                </code>
                <button
                  type="button"
                  onClick={() => void handleCopyPassword()}
                  className="px-3 py-2 text-slate-500 hover:text-cyan-600 hover:bg-cyan-50 border border-slate-200 rounded-xl transition-colors"
                  title="Copy password"
                >
                  {copied ? <Check className="h-4 w-4 text-emerald-500" /> : <Copy className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <DialogFooter>
              <button
                type="button"
                onClick={() => onOpenChange(false)}
                className="px-4 py-2 text-sm font-bold rounded-xl transition-all"
                style={{ background: 'linear-gradient(135deg, #00C4D4, #00E5FF)', color: '#0a1628' }}
              >
                Done
              </button>
            </DialogFooter>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>Reset password</DialogTitle>
              <DialogDescription>
                Set a new temporary password for{' '}
                <span className="font-medium text-slate-700">
                  {user?.name ?? user?.email ?? 'this user'}
                </span>
                . They will be required to change it on their next login.
              </DialogDescription>
            </DialogHeader>

            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">
                Temporary password
              </label>
              <PasswordInput value={password} onChange={setPassword} />
              <p className="mt-1.5 text-xs text-slate-400">
                At least 10 characters with a letter and a number. You can copy it again on the next step.
              </p>
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
                Reset password
              </button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
