'use client';

import { useState } from 'react';
import { formatDistanceToNow } from 'date-fns';
import {
  CheckCircle2, XCircle, Loader2, Eye, EyeOff, Trash2, KeyRound,
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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

interface OpenAIKeyFormProps {
  initialConfigured: boolean;
  initialSetAt: string | null;
}

export function OpenAIKeyForm({ initialConfigured, initialSetAt }: OpenAIKeyFormProps) {
  const [configured, setConfigured] = useState(initialConfigured);
  const [setAt, setSetAt] = useState<string | null>(initialSetAt);
  const [apiKey, setApiKey] = useState('');
  const [showKey, setShowKey] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  async function handleSave() {
    if (!apiKey.trim()) return;
    setSaving(true);
    try {
      const res = await fetch('/api/settings/openai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ apiKey: apiKey.trim() }),
      });
      const data = await res.json() as { error?: string; configured?: boolean; setAt?: string };
      if (!res.ok) throw new Error(data.error ?? 'Unknown error');
      setConfigured(true);
      setSetAt(data.setAt ?? new Date().toISOString());
      setApiKey('');
      toast.success('API key saved and verified');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to save API key');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    setDeleting(true);
    try {
      const res = await fetch('/api/settings/openai', { method: 'DELETE' });
      if (!res.ok) throw new Error();
      setConfigured(false);
      setSetAt(null);
      toast.success('API key removed');
    } catch {
      toast.error('Failed to remove API key');
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
      <div className="flex items-start gap-3 mb-6">
        <div className="h-9 w-9 rounded-lg bg-emerald-50 flex items-center justify-center flex-shrink-0">
          <KeyRound className="h-4 w-4 text-emerald-600" />
        </div>
        <div>
          <h2 className="text-sm font-semibold text-slate-900">OpenAI API Key</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Required for AI comment classification and reply generation (gpt-4o-mini).
            Stored encrypted with AES-256-GCM.
          </p>
        </div>
      </div>

      {/* Status badge */}
      <div className="flex items-center gap-2 mb-5 p-3 rounded-lg bg-slate-50 border border-slate-200">
        {configured ? (
          <>
            <CheckCircle2 className="h-4 w-4 text-emerald-600 flex-shrink-0" />
            <div className="flex-1">
              <p className="text-sm font-medium text-slate-900">Configured</p>
              {setAt && (
                <p className="text-xs text-slate-500">
                  Set {formatDistanceToNow(new Date(setAt), { addSuffix: true })}
                </p>
              )}
            </div>
            <AlertDialog>
              <AlertDialogTrigger
                disabled={deleting}
                className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
              >
                {deleting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                Remove
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Remove API key?</AlertDialogTitle>
                  <AlertDialogDescription>
                    All bots will stop using AI features until a new key is configured.
                    Comments will be logged as IGNORED.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={() => void handleDelete()}
                    className="bg-red-600 hover:bg-red-700 text-white"
                  >
                    Remove
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </>
        ) : (
          <>
            <XCircle className="h-4 w-4 text-slate-400 flex-shrink-0" />
            <p className="text-sm text-slate-500">Not configured — AI features are disabled</p>
          </>
        )}
      </div>

      {/* Input form */}
      <div className="space-y-3">
        <div>
          <Label className="text-sm font-medium text-slate-700 mb-1.5 block">
            {configured ? 'Replace API key' : 'Enter API key'}
          </Label>
          <div className="relative">
            <Input
              type={showKey ? 'text' : 'password'}
              placeholder="sk-proj-..."
              value={apiKey}
              onChange={e => setApiKey(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') void handleSave(); }}
              className="pr-10 font-mono text-sm"
              autoComplete="off"
            />
            <button
              type="button"
              onClick={() => setShowKey(v => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
              tabIndex={-1}
            >
              {showKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            The key is validated against OpenAI before being saved. It is never stored in plain text.
          </p>
        </div>

        <button
          onClick={() => void handleSave()}
          disabled={saving || !apiKey.trim()}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50"
        >
          {saving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
          {saving ? 'Verifying…' : 'Save and verify'}
        </button>
      </div>
    </div>
  );
}
