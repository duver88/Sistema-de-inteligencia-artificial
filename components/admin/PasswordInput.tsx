'use client';

import { useState } from 'react';
import { Copy, Check, Eye, EyeOff, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';

// Unambiguous charset (no 0/O, 1/l/I) so temporary passwords are easy to read aloud
const PASSWORD_CHARSET =
  'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$%&*';

export function generateTempPassword(length = 14): string {
  const values = new Uint32Array(length);
  crypto.getRandomValues(values);
  return Array.from(values, (v) => PASSWORD_CHARSET[v % PASSWORD_CHARSET.length]).join('');
}

interface PasswordInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

/**
 * Password field with a random generator and a copy-to-clipboard button.
 * Used by both the "Create user" and "Reset password" modals.
 */
export function PasswordInput({ value, onChange, placeholder }: PasswordInputProps) {
  const [visible, setVisible] = useState(true);
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    if (!value) return;
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      toast.success('Password copied to clipboard');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('Failed to copy password');
    }
  }

  return (
    <div className="flex gap-2">
      <div className="relative flex-1">
        <input
          type={visible ? 'text' : 'password'}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder ?? 'Temporary password'}
          autoComplete="new-password"
          className="w-full text-sm border border-slate-200 rounded-xl pl-3 pr-9 py-2 bg-white font-mono focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:border-transparent"
        />
        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600 rounded-lg transition-colors"
          title={visible ? 'Hide password' : 'Show password'}
        >
          {visible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
      </div>
      <button
        type="button"
        onClick={() => onChange(generateTempPassword())}
        className="px-3 py-2 text-slate-500 hover:text-cyan-600 hover:bg-cyan-50 border border-slate-200 rounded-xl transition-colors"
        title="Generate random password"
      >
        <RefreshCw className="h-4 w-4" />
      </button>
      <button
        type="button"
        onClick={() => void handleCopy()}
        disabled={!value}
        className="px-3 py-2 text-slate-500 hover:text-cyan-600 hover:bg-cyan-50 border border-slate-200 rounded-xl transition-colors disabled:opacity-50"
        title="Copy password"
      >
        {copied ? <Check className="h-4 w-4 text-emerald-500" /> : <Copy className="h-4 w-4" />}
      </button>
    </div>
  );
}
