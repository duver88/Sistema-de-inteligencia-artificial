'use client';

import { useState } from 'react';
import { Plus, Trash2, Loader2, ShieldAlert, EyeOff, FlaskConical } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { testPattern } from '@/lib/moderation/keyword-detector';

interface ModerationRulesEditorProps {
  botId: string;
  initialDeleteKeywords: string[];
  initialSpamKeywords: string[];
}

function PatternList({
  title,
  description,
  icon,
  color,
  patterns,
  onAdd,
  onRemove,
  saving,
}: {
  title: string;
  description: string;
  icon: React.ReactNode;
  color: 'red' | 'amber';
  patterns: string[];
  onAdd: (p: string) => Promise<void>;
  onRemove: (p: string) => Promise<void>;
  saving: boolean;
}) {
  const [input, setInput] = useState('');
  const [testText, setTestText] = useState('');
  const [showTester, setShowTester] = useState(false);

  const bgColor = color === 'red' ? 'bg-red-50 border-red-200' : 'bg-amber-50 border-amber-200';
  const iconBg = color === 'red' ? 'bg-red-100 text-red-600' : 'bg-amber-100 text-amber-600';
  const badgeBg = color === 'red' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700';

  const matchedPatterns = testText
    ? patterns.filter(p => testPattern(p, testText))
    : [];

  async function handleAdd() {
    const trimmed = input.trim();
    if (!trimmed) return;
    try {
      new RegExp(trimmed, 'i');
    } catch {
      toast.error('Patrón regex inválido');
      return;
    }
    await onAdd(trimmed);
    setInput('');
  }

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
      <div className="flex items-start justify-between mb-5">
        <div className="flex items-center gap-3">
          <div className={`h-10 w-10 rounded-xl flex items-center justify-center ${iconBg}`}>
            {icon}
          </div>
          <div>
            <h3 className="text-sm font-semibold text-slate-900">{title}</h3>
            <p className="text-xs text-slate-500 mt-0.5">{description}</p>
          </div>
        </div>
        <button
          onClick={() => setShowTester(v => !v)}
          className={`flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded-xl transition-colors ${showTester ? `${bgColor} border` : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
        >
          <FlaskConical className="h-3.5 w-3.5" />
          Probar
        </button>
      </div>

      {/* Pattern tester */}
      {showTester && (
        <div className={`border rounded-xl p-3.5 mb-4 ${bgColor}`}>
          <Label className="text-xs font-medium text-slate-600 mb-1.5 block">
            Texto de comentario de prueba
          </Label>
          <Input
            placeholder="Pega un comentario para probar contra tus patrones…"
            value={testText}
            onChange={e => setTestText(e.target.value)}
            className="text-sm bg-white"
          />
          {testText && (
            <p className="mt-2 text-xs">
              {matchedPatterns.length > 0 ? (
                <span className="text-red-700 font-medium">
                  Coincidencias: {matchedPatterns.map(p => `"${p}"`).join(', ')}
                </span>
              ) : (
                <span className="text-green-700 font-medium">Sin coincidencias — el comentario pasaría.</span>
              )}
            </p>
          )}
        </div>
      )}

      {/* Add pattern */}
      <div className="flex gap-2 mb-4">
        <Input
          placeholder="Ej: muy caro o regex como put[ao]"
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') void handleAdd(); }}
          className="text-sm"
        />
        <button
          onClick={() => void handleAdd()}
          disabled={saving || !input.trim()}
          className="flex items-center gap-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-900 text-white text-sm font-medium rounded-xl transition-colors disabled:opacity-50 flex-shrink-0"
        >
          {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
          Agregar
        </button>
      </div>

      {/* Pattern list */}
      {patterns.length === 0 ? (
        <p className="text-xs text-slate-400 text-center py-4">
          Sin patrones aún. Agrega uno arriba.
        </p>
      ) : (
        <div className="flex flex-wrap gap-2">
          {patterns.map(p => (
            <span
              key={p}
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-mono font-medium ${badgeBg}`}
            >
              {p}
              <button
                onClick={() => void onRemove(p)}
                className="ml-0.5 hover:opacity-70 transition-opacity"
              >
                <Trash2 className="h-3 w-3" />
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

export function ModerationRulesEditor({
  botId,
  initialDeleteKeywords,
  initialSpamKeywords,
}: ModerationRulesEditorProps) {
  const [deleteKeywords, setDeleteKeywords] = useState(initialDeleteKeywords);
  const [spamKeywords, setSpamKeywords] = useState(initialSpamKeywords);
  const [saving, setSaving] = useState(false);

  async function patch(field: 'deleteKeywords' | 'spamKeywords', value: string[]) {
    setSaving(true);
    try {
      const res = await fetch(`/api/bots/${botId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ [field]: value }),
      });
      if (!res.ok) throw new Error();
    } catch {
      toast.error('Error al guardar los cambios');
    } finally {
      setSaving(false);
    }
  }

  async function addDelete(pattern: string) {
    const next = [...deleteKeywords, pattern];
    setDeleteKeywords(next);
    await patch('deleteKeywords', next);
    toast.success('Patrón agregado');
  }

  async function removeDelete(pattern: string) {
    const next = deleteKeywords.filter(p => p !== pattern);
    setDeleteKeywords(next);
    await patch('deleteKeywords', next);
    toast.success('Patrón eliminado');
  }

  async function addSpam(pattern: string) {
    const next = [...spamKeywords, pattern];
    setSpamKeywords(next);
    await patch('spamKeywords', next);
    toast.success('Patrón agregado');
  }

  async function removeSpam(pattern: string) {
    const next = spamKeywords.filter(p => p !== pattern);
    setSpamKeywords(next);
    await patch('spamKeywords', next);
    toast.success('Patrón eliminado');
  }

  return (
    <div className="space-y-4">
      <PatternList
        title="Palabras Clave para Eliminar"
        description="Los comentarios que coincidan con estos patrones serán eliminados permanentemente."
        icon={<ShieldAlert className="h-4 w-4" />}
        color="red"
        patterns={deleteKeywords}
        onAdd={addDelete}
        onRemove={removeDelete}
        saving={saving}
      />
      <PatternList
        title="Palabras Clave de Spam"
        description="Los comentarios que coincidan con estos patrones serán ocultados (no eliminados)."
        icon={<EyeOff className="h-4 w-4" />}
        color="amber"
        patterns={spamKeywords}
        onAdd={addSpam}
        onRemove={removeSpam}
        saving={saving}
      />
    </div>
  );
}
