'use client';

import { useState } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { enUS } from 'date-fns/locale';
import { CheckCircle2, XCircle, Loader2, Eye, EyeOff, Trash2, KeyRound } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader,
  AlertDialogTitle, AlertDialogTrigger,
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
      toast.success('API key deleted');
    } catch {
      toast.error('Failed to delete API key');
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
      {/* Header with gradient */}
      <div className="px-6 py-5 border-b border-slate-100" style={{background: 'linear-gradient(135deg, #ecfeff 0%, #cffafe 100%)'}}>
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{background: 'linear-gradient(135deg, #00C4D4, #00E5FF)'}}>
            <KeyRound className="h-5 w-5" style={{color: '#0a1628'}} />
          </div>
          <div>
            <h2 className="text-sm font-bold text-slate-900">OpenAI API Key</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Required for AI classification (gpt-4o-mini). Encrypted with AES-256-GCM.
            </p>
          </div>
        </div>
      </div>

      <div className="p-6 space-y-5">
        {/* Status */}
        <div className={`flex items-center gap-3 p-4 rounded-xl border ${configured ? 'bg-emerald-50 border-emerald-200' : 'bg-slate-50 border-slate-200'}`}>
          {configured ? (
            <>
              <CheckCircle2 className="h-5 w-5 text-emerald-600 flex-shrink-0" />
              <div className="flex-1">
                <p className="text-sm font-bold text-emerald-800">Configured</p>
                {setAt && (
                  <p className="text-xs text-emerald-600 mt-0.5">
                    Saved {formatDistanceToNow(new Date(setAt), { addSuffix: true, locale: enUS })}
                  </p>
                )}
              </div>
              <AlertDialog>
                <AlertDialogTrigger
                  disabled={deleting}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                >
                  {deleting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                  Delete
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Delete API key?</AlertDialogTitle>
                    <AlertDialogDescription>
                      All bots will stop using AI features until a new key is configured.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={() => void handleDelete()} className="bg-red-600 hover:bg-red-700 text-white">
                      Delete
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </>
          ) : (
            <>
              <XCircle className="h-5 w-5 text-slate-400 flex-shrink-0" />
              <p className="text-sm text-slate-500 font-medium">Not configured — AI disabled</p>
            </>
          )}
        </div>

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
          <p className="text-xs text-slate-400">Validated against OpenAI before saving. Never stored in plain text.</p>
        </div>

        <button
          onClick={() => void handleSave()}
          disabled={saving || !apiKey.trim()}
          className="flex items-center gap-2 px-5 py-2.5 text-sm font-bold rounded-xl transition-all shadow-md hover:shadow-lg active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
          style={{background: 'linear-gradient(135deg, #00C4D4, #00E5FF)', color: '#0a1628'}}
        >
          {saving && <Loader2 className="h-4 w-4 animate-spin" />}
          {saving ? 'Verifying…' : 'Save and verify'}
        </button>
      </div>
    </div>
  );
}
