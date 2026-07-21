'use client';

import { useCallback, useEffect, useState } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { enUS } from 'date-fns/locale';
import {
  AlertTriangle,
  CheckCircle2,
  Eye,
  EyeOff,
  KeyRound,
  Loader2,
  Trash2,
  XCircle,
} from 'lucide-react';
import { toast } from 'sonner';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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

interface OpenAiKeyStatus {
  configured: boolean;
  setAt: string | null;
  source: 'platform' | 'none';
}

export function OpenAiKeyCard() {
  const [status, setStatus] = useState<OpenAiKeyStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);

  const [apiKey, setApiKey] = useState('');
  const [showKey, setShowKey] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const trimmedKey = apiKey.trim();
  const formatValid =
    trimmedKey.startsWith('sk-') && trimmedKey.length >= 20 && trimmedKey.length <= 200;

  const fetchStatus = useCallback(async () => {
    setLoadError(false);
    try {
      const res = await fetch('/api/admin/openai', { cache: 'no-store' });
      if (!res.ok) throw new Error();
      const data = (await res.json()) as OpenAiKeyStatus;
      setStatus(data);
    } catch {
      setLoadError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchStatus();
  }, [fetchStatus]);

  async function handleSave() {
    if (!formatValid || saving) return;
    setSaving(true);
    try {
      const res = await fetch('/api/admin/openai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ apiKey: trimmedKey }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) throw new Error(data.error ?? 'Failed to save API key');
      setApiKey('');
      toast.success('Platform API key saved and verified');
      await fetchStatus();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to save API key');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    setDeleting(true);
    try {
      const res = await fetch('/api/admin/openai', { method: 'DELETE' });
      if (!res.ok) throw new Error();
      toast.success('Platform API key removed');
      await fetchStatus();
    } catch {
      toast.error('Failed to remove API key');
    } finally {
      setDeleting(false);
    }
  }

  const configured = status?.configured ?? false;

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
      {/* Header */}
      <div
        className="px-6 py-5 border-b border-slate-100"
        style={{ background: 'linear-gradient(135deg, #ecfeff 0%, #cffafe 100%)' }}
      >
        <div className="flex items-center gap-3">
          <div
            className="h-10 w-10 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ background: 'linear-gradient(135deg, #00C4D4, #00E5FF)' }}
          >
            <KeyRound className="h-5 w-5" style={{ color: '#0a1628' }} />
          </div>
          <div>
            <h2 className="text-sm font-bold text-slate-900">Platform OpenAI API Key</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Powers AI classification and replies (gpt-4o-mini). Encrypted with AES-256-GCM.
            </p>
          </div>
        </div>
      </div>

      <div className="p-6 space-y-5">
        {/* Global warning */}
        <div className="flex items-start gap-2.5 p-3.5 bg-amber-50 border border-amber-200 rounded-xl">
          <AlertTriangle className="h-4 w-4 text-amber-600 flex-shrink-0 mt-0.5" />
          <p className="text-xs text-amber-800">
            This key applies to <span className="font-bold">all users and tenants</span> on the
            platform. AI classifications and auto-replies are billed to this key, except for
            tenants still running on a legacy key of their own.
          </p>
        </div>

        {/* Status */}
        {loading ? (
          <div className="flex items-center gap-3 p-4 rounded-xl border bg-slate-50 border-slate-200">
            <Loader2 className="h-5 w-5 text-slate-400 animate-spin flex-shrink-0" />
            <p className="text-sm text-slate-500 font-medium">Loading key status…</p>
          </div>
        ) : loadError ? (
          <div className="flex items-center gap-3 p-4 rounded-xl border bg-red-50 border-red-200">
            <XCircle className="h-5 w-5 text-red-500 flex-shrink-0" />
            <p className="text-sm text-red-700 font-medium flex-1">Failed to load key status.</p>
            <button
              type="button"
              onClick={() => { setLoading(true); void fetchStatus(); }}
              className="px-3 py-1.5 text-xs font-bold text-red-600 hover:bg-red-100 rounded-lg transition-colors"
            >
              Retry
            </button>
          </div>
        ) : (
          <div
            className={`flex items-center gap-3 p-4 rounded-xl border ${
              configured ? 'bg-emerald-50 border-emerald-200' : 'bg-slate-50 border-slate-200'
            }`}
          >
            {configured ? (
              <>
                <CheckCircle2 className="h-5 w-5 text-emerald-600 flex-shrink-0" />
                <div className="flex-1">
                  <p className="text-sm font-bold text-emerald-800">Configured</p>
                  {status?.setAt && (
                    <p className="text-xs text-emerald-600 mt-0.5">
                      Saved {formatDistanceToNow(new Date(status.setAt), { addSuffix: true, locale: enUS })}
                    </p>
                  )}
                </div>
                <AlertDialog>
                  <AlertDialogTrigger
                    disabled={deleting}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                  >
                    {deleting ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Trash2 className="h-3.5 w-3.5" />
                    )}
                    Remove
                  </AlertDialogTrigger>
                  <AlertDialogContent className="bg-white">
                    <AlertDialogHeader>
                      <AlertDialogTitle>Remove platform API key?</AlertDialogTitle>
                      <AlertDialogDescription>
                        AI features will stop working for all tenants without a legacy API key of
                        their own until a new platform key is configured. Tenants that still have
                        a legacy key keep running on it, billed to that key.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={() => void handleDelete()}
                        className="bg-red-600 hover:bg-red-700 text-white"
                      >
                        Remove key
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </>
            ) : (
              <>
                <XCircle className="h-5 w-5 text-slate-400 flex-shrink-0" />
                <p className="text-sm text-slate-500 font-medium">
                  Not configured — AI only runs for tenants that still have a legacy key of their own
                </p>
              </>
            )}
          </div>
        )}

        {/* Input */}
        <div className="space-y-1.5">
          <Label className="text-sm font-bold text-slate-700">
            {configured ? 'Replace API key' : 'Enter API key'}
          </Label>
          <div className="relative">
            <Input
              type={showKey ? 'text' : 'password'}
              placeholder="sk-proj-..."
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') void handleSave(); }}
              className="pr-10 font-mono text-sm"
              autoComplete="off"
            />
            <button
              type="button"
              onClick={() => setShowKey((v) => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
              tabIndex={-1}
            >
              {showKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
          {trimmedKey && !formatValid ? (
            <p className="text-xs text-red-500">
              The key must start with &quot;sk-&quot; and be 20-200 characters long.
            </p>
          ) : (
            <p className="text-xs text-slate-400">
              Validated against OpenAI before saving. Never stored in plain text.
            </p>
          )}
        </div>

        <button
          type="button"
          onClick={() => void handleSave()}
          disabled={saving || !formatValid}
          className="flex items-center gap-2 px-5 py-2.5 text-sm font-bold rounded-xl transition-all shadow-md hover:shadow-lg active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
          style={{ background: 'linear-gradient(135deg, #00C4D4, #00E5FF)', color: '#0a1628' }}
        >
          {saving && <Loader2 className="h-4 w-4 animate-spin" />}
          {saving ? 'Verifying…' : 'Save and verify'}
        </button>
      </div>
    </div>
  );
}
