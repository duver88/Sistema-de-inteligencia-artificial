'use client';

import { useEffect, useState } from 'react';
import { Check, Copy, Loader2, X } from 'lucide-react';
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
import { dateInputToUtcEndOfDay } from './access';
import type { AdminUser } from './types';

interface CreateUserDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: (user: AdminUser) => void;
}

export function CreateUserDialog({ open, onOpenChange, onCreated }: CreateUserDialogProps) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  // yyyy-MM-dd from the date input; '' = unlimited access
  const [expiresOn, setExpiresOn] = useState('');
  const [submitting, setSubmitting] = useState(false);
  // After a successful create, keep the dialog open on a confirmation step
  // showing the temporary password one last time — closing immediately
  // would destroy the only copy of the credential.
  const [created, setCreated] = useState<{ email: string; password: string } | null>(null);
  const [copied, setCopied] = useState(false);

  // Reset the form (with a fresh random password) every time the modal opens
  useEffect(() => {
    if (open) {
      setName('');
      setEmail('');
      setPassword(generateTempPassword());
      setExpiresOn('');
      setCreated(null);
      setCopied(false);
    }
  }, [open]);

  const canSubmit = name.trim().length > 0 && email.trim().length > 0 && password.length >= 8;

  async function handleSubmit() {
    if (!canSubmit || submitting) return;
    setSubmitting(true);
    try {
      const res = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim(),
          password,
          // Access is valid through the END of the chosen day, in UTC
          accessExpiresAt: expiresOn ? dateInputToUtcEndOfDay(expiresOn) : null,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(data.error ?? 'Failed to create user');
        return;
      }
      toast.success('User created');
      onCreated(data.user as AdminUser);
      setCreated({ email: (data.user as AdminUser).email ?? email.trim(), password });
    } catch {
      toast.error('Failed to create user');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleCopyPassword() {
    if (!created) return;
    try {
      await navigator.clipboard.writeText(created.password);
      setCopied(true);
      toast.success('Password copied to clipboard');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('Failed to copy password');
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md bg-white">
        {created ? (
          <>
            <DialogHeader>
              <DialogTitle>User created</DialogTitle>
              <DialogDescription>
                Copy the temporary password now and send it to the user — it
                is never shown again after you close this dialog.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-3">
              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">
                  Email
                </p>
                <p className="text-sm text-slate-900 border border-slate-200 rounded-xl px-3 py-2 bg-slate-50 break-all">
                  {created.email}
                </p>
              </div>
              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">
                  Temporary password
                </p>
                <div className="flex gap-2">
                  <code className="flex-1 text-sm font-mono text-slate-900 border border-slate-200 rounded-xl px-3 py-2 bg-slate-50 break-all">
                    {created.password}
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
              <DialogTitle>Create user</DialogTitle>
              <DialogDescription>
                A new tenant will be created for this user. They must change the
                temporary password on first login.
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
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">
                  Temporary password
                </label>
                <PasswordInput value={password} onChange={setPassword} />
                <p className="mt-1.5 text-xs text-slate-400">
                  At least 10 characters with a letter and a number. You can copy it again on the next step.
                </p>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">
                  Access expires on
                </label>
                <div className="flex gap-2">
                  <input
                    type="date"
                    value={expiresOn}
                    onChange={(e) => setExpiresOn(e.target.value)}
                    min={new Date().toISOString().slice(0, 10)}
                    className="flex-1 text-sm border border-slate-200 rounded-xl px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:border-transparent"
                  />
                  <button
                    type="button"
                    onClick={() => setExpiresOn('')}
                    disabled={!expiresOn}
                    className="px-3 py-2 text-slate-500 hover:text-red-600 hover:bg-red-50 border border-slate-200 rounded-xl transition-colors disabled:opacity-30 disabled:pointer-events-none"
                    title="Clear expiration date"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
                <p className="mt-1.5 text-xs text-slate-400">
                  Leave empty for unlimited access.
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
                Create user
              </button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
