'use client';

import { useState } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';
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
      if (!res.ok) throw new Error(data.error ?? 'Error desconocido');
      setConfigured(true);
      setSetAt(data.setAt ?? new Date().toISOString());
      setApiKey('');
      toast.success('Clave API guardada y verificada');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error al guardar la clave API');
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
      toast.success('Clave API eliminada');
    } catch {
      toast.error('Error al eliminar la clave API');
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
      <div className="flex items-start gap-3 mb-6">
        <div className="h-10 w-10 rounded-xl bg-emerald-50 flex items-center justify-center flex-shrink-0">
          <KeyRound className="h-5 w-5 text-emerald-600" />
        </div>
        <div>
          <h2 className="text-sm font-semibold text-slate-900">Clave API de OpenAI</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Requerida para clasificación de comentarios y generación de respuestas con IA (gpt-4o-mini).
            Almacenada cifrada con AES-256-GCM.
          </p>
        </div>
      </div>

      {/* Status badge */}
      <div className="flex items-center gap-3 mb-5 p-3.5 rounded-xl bg-slate-50 border border-slate-200">
        {configured ? (
          <>
            <CheckCircle2 className="h-4 w-4 text-emerald-600 flex-shrink-0" />
            <div className="flex-1">
              <p className="text-sm font-medium text-slate-900">Configurada</p>
              {setAt && (
                <p className="text-xs text-slate-500">
                  Guardada {formatDistanceToNow(new Date(setAt), { addSuffix: true, locale: es })}
                </p>
              )}
            </div>
            <AlertDialog>
              <AlertDialogTrigger
                disabled={deleting}
                className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
              >
                {deleting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                Eliminar
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>¿Eliminar clave API?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Todos los bots dejarán de usar funciones de IA hasta que se configure una nueva clave.
                    Los comentarios se registrarán como IGNORADOS.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={() => void handleDelete()}
                    className="bg-red-600 hover:bg-red-700 text-white"
                  >
                    Eliminar
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </>
        ) : (
          <>
            <XCircle className="h-4 w-4 text-slate-400 flex-shrink-0" />
            <p className="text-sm text-slate-500">Sin configurar — Las funciones de IA están desactivadas</p>
          </>
        )}
      </div>

      {/* Input form */}
      <div className="space-y-4">
        <div>
          <Label className="text-sm font-medium text-slate-700 mb-1.5 block">
            {configured ? 'Reemplazar clave API' : 'Ingresar clave API'}
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
          <p className="text-xs text-slate-400 mt-1.5">
            La clave se valida contra OpenAI antes de guardarse. Nunca se almacena en texto plano.
          </p>
        </div>

        <button
          onClick={() => void handleSave()}
          disabled={saving || !apiKey.trim()}
          className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-700 hover:to-indigo-600 text-white text-sm font-medium rounded-xl transition-all shadow-sm hover:shadow-md disabled:opacity-50"
        >
          {saving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
          {saving ? 'Verificando…' : 'Guardar y verificar'}
        </button>
      </div>
    </div>
  );
}
