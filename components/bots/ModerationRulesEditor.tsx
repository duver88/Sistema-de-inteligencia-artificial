'use client';

import { useState, useEffect, useRef } from 'react';
import { Plus, Trash2, Loader2, ShieldAlert, EyeOff, FlaskConical, RotateCcw, Zap, Brain, CheckCircle2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { testPattern } from '@/lib/moderation/keyword-detector';

type SaveStatus = 'idle' | 'saving' | 'saved';

// ── Default keyword sets ───────────────────────────────────────────────────────

const DEFAULT_DELETE_KEYWORDS = [
  'estafa', 'estafadores?', 'ladrón|ladrones', 'roban|robando|robaron',
  'corruptos?', 'mentirosos?', 'fraude', 'timadores?', 'engañan|engañaron',
  'maldita', 'mierda', 'puta|puto', 'hijue', 'imbécil|imbecil',
  'idiota', 'pendejo', 'cárcel|carcel', 'denuncia', 'demanda legal',
];

const DEFAULT_SPAM_KEYWORDS = [
  'gana dinero', 'trabaja desde casa', 'inversión segura',
  'crypto|bitcoin|ethereum', 'sígame|follow me', 'link en bio|link in bio',
  '\\+\\d{7,}', 'telegram\\.me|t\\.me', 'ventas directas', 'multinivel|mlm',
  'suscríbete|subscribe',
];

// ── Props ──────────────────────────────────────────────────────────────────────

interface ModerationRulesEditorProps {
  botId: string;
  initialDeleteKeywords: string[];
  initialSpamKeywords: string[];
  initialDeleteInstructions: string;
  initialSpamInstructions: string;
}

// ── PatternList sub-component ──────────────────────────────────────────────────

function PatternList({
  title,
  description,
  icon,
  color,
  patterns,
  defaults,
  onAdd,
  onRemove,
  onLoadDefaults,
  saving,
}: {
  title: string;
  description: string;
  icon: React.ReactNode;
  color: 'red' | 'amber';
  patterns: string[];
  defaults: string[];
  onAdd: (p: string) => Promise<void>;
  onRemove: (p: string) => Promise<void>;
  onLoadDefaults: () => Promise<void>;
  saving: boolean;
}) {
  const [input, setInput] = useState('');
  const [testText, setTestText] = useState('');
  const [showTester, setShowTester] = useState(false);
  const [loadingDefaults, setLoadingDefaults] = useState(false);

  const bgColor = color === 'red' ? 'bg-red-50 border-red-200' : 'bg-amber-50 border-amber-200';
  const iconBg = color === 'red' ? 'bg-red-100 text-red-600' : 'bg-amber-100 text-amber-600';
  const badgeBg = color === 'red' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700';

  const matchedPatterns = testText ? patterns.filter(p => testPattern(p, testText)) : [];
  const missingDefaults = defaults.filter(d => !patterns.includes(d));

  async function handleAdd() {
    const trimmed = input.trim();
    if (!trimmed) return;
    try { new RegExp(trimmed, 'i'); } catch {
      toast.error('Patrón regex inválido');
      return;
    }
    if (patterns.includes(trimmed)) {
      toast.error('Este patrón ya existe');
      return;
    }
    await onAdd(trimmed);
    setInput('');
  }

  async function handleLoadDefaults() {
    if (missingDefaults.length === 0) {
      toast.info('Ya tienes todos los patrones predeterminados');
      return;
    }
    setLoadingDefaults(true);
    try {
      await onLoadDefaults();
      toast.success(`${missingDefaults.length} patrón${missingDefaults.length !== 1 ? 'es' : ''} predeterminado${missingDefaults.length !== 1 ? 's' : ''} cargado${missingDefaults.length !== 1 ? 's' : ''}`);
    } finally {
      setLoadingDefaults(false);
    }
  }

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
      <div className="flex items-start justify-between mb-5">
        <div className="flex items-center gap-3">
          <div className={`h-10 w-10 rounded-xl flex items-center justify-center ${iconBg}`}>
            {icon}
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900">{title}</h3>
            <p className="text-xs text-slate-500 mt-0.5">{description}</p>
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => void handleLoadDefaults()}
            disabled={loadingDefaults || missingDefaults.length === 0}
            className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors disabled:opacity-40"
            title={missingDefaults.length > 0 ? `Agregar ${missingDefaults.length} patrones predeterminados` : 'Ya están todos los predeterminados'}
          >
            {loadingDefaults ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RotateCcw className="h-3.5 w-3.5" />}
            Defaults {missingDefaults.length > 0 && `(+${missingDefaults.length})`}
          </button>
          <button
            onClick={() => setShowTester(v => !v)}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold rounded-xl transition-colors ${showTester ? `${bgColor} border` : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
          >
            <FlaskConical className="h-3.5 w-3.5" />
            Probar
          </button>
        </div>
      </div>

      {/* Pattern tester */}
      {showTester && (
        <div className={`border rounded-xl p-3.5 mb-4 ${bgColor}`}>
          <Label className="text-xs font-semibold text-slate-600 mb-1.5 block">
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
                <span className="text-red-700 font-semibold">
                  Coincide con: {matchedPatterns.map(p => `"${p}"`).join(', ')}
                </span>
              ) : (
                <span className="text-emerald-700 font-semibold">Sin coincidencias — el comentario pasaría al nivel IA.</span>
              )}
            </p>
          )}
        </div>
      )}

      {/* Add pattern input */}
      <div className="flex gap-2 mb-4">
        <Input
          placeholder="Ej: muy caro  o regex como put[ao]"
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') void handleAdd(); }}
          className="text-sm font-mono"
        />
        <button
          onClick={() => void handleAdd()}
          disabled={saving || !input.trim()}
          className="flex items-center gap-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-900 text-white text-sm font-semibold rounded-xl transition-colors disabled:opacity-50 flex-shrink-0"
        >
          {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
          Agregar
        </button>
      </div>

      {/* Pattern chips */}
      {patterns.length === 0 ? (
        <p className="text-xs text-slate-400 text-center py-4 border border-dashed border-slate-200 rounded-xl">
          Sin patrones aún — usa "Defaults" para cargar los predeterminados.
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

// ── Main component ─────────────────────────────────────────────────────────────

export function ModerationRulesEditor({
  botId,
  initialDeleteKeywords,
  initialSpamKeywords,
  initialDeleteInstructions,
  initialSpamInstructions,
}: ModerationRulesEditorProps) {
  const [deleteKeywords, setDeleteKeywords] = useState(initialDeleteKeywords);
  const [spamKeywords, setSpamKeywords] = useState(initialSpamKeywords);
  const [saving, setSaving] = useState(false);

  // Level 2 — AI instructions draft state
  const [instrDraft, setInstrDraft] = useState({
    deleteInstructions: initialDeleteInstructions,
    spamInstructions: initialSpamInstructions,
  });
  const [savedInstr, setSavedInstr] = useState({
    deleteInstructions: initialDeleteInstructions,
    spamInstructions: initialSpamInstructions,
  });
  const [instrStatus, setInstrStatus] = useState<SaveStatus>('idle');
  const savedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const instrDirty =
    instrDraft.deleteInstructions !== savedInstr.deleteInstructions ||
    instrDraft.spamInstructions !== savedInstr.spamInstructions;

  useEffect(() => {
    return () => { if (savedTimerRef.current) clearTimeout(savedTimerRef.current); };
  }, []);

  async function patchKeywords(field: 'deleteKeywords' | 'spamKeywords', value: string[]) {
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

  async function saveInstructions() {
    if (!instrDirty || instrStatus === 'saving') return;
    setInstrStatus('saving');
    try {
      const res = await fetch(`/api/bots/${botId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          deleteInstructions: instrDraft.deleteInstructions,
          spamInstructions: instrDraft.spamInstructions,
        }),
      });
      if (!res.ok) throw new Error();
      setSavedInstr({ ...instrDraft });
      setInstrStatus('saved');
      savedTimerRef.current = setTimeout(() => setInstrStatus('idle'), 2000);
    } catch {
      toast.error('Error al guardar las instrucciones');
      setInstrStatus('idle');
    }
  }

  async function addDelete(pattern: string) {
    const next = [...deleteKeywords, pattern];
    setDeleteKeywords(next);
    await patchKeywords('deleteKeywords', next);
    toast.success('Patrón agregado');
  }

  async function removeDelete(pattern: string) {
    const next = deleteKeywords.filter(p => p !== pattern);
    setDeleteKeywords(next);
    await patchKeywords('deleteKeywords', next);
    toast.success('Patrón eliminado');
  }

  async function loadDeleteDefaults() {
    const missing = DEFAULT_DELETE_KEYWORDS.filter(d => !deleteKeywords.includes(d));
    const next = [...deleteKeywords, ...missing];
    setDeleteKeywords(next);
    await patchKeywords('deleteKeywords', next);
  }

  async function addSpam(pattern: string) {
    const next = [...spamKeywords, pattern];
    setSpamKeywords(next);
    await patchKeywords('spamKeywords', next);
    toast.success('Patrón agregado');
  }

  async function removeSpam(pattern: string) {
    const next = spamKeywords.filter(p => p !== pattern);
    setSpamKeywords(next);
    await patchKeywords('spamKeywords', next);
    toast.success('Patrón eliminado');
  }

  async function loadSpamDefaults() {
    const missing = DEFAULT_SPAM_KEYWORDS.filter(d => !spamKeywords.includes(d));
    const next = [...spamKeywords, ...missing];
    setSpamKeywords(next);
    await patchKeywords('spamKeywords', next);
  }

  return (
    <div className="space-y-8">

      {/* ── NIVEL 1 ── */}
      <div>
        <div className="flex items-center gap-3 mb-4">
          <div className="h-8 w-8 rounded-lg bg-slate-800 flex items-center justify-center flex-shrink-0">
            <Zap className="h-4 w-4 text-white" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-slate-900">Nivel 1 — Palabras clave</h2>
            <p className="text-xs text-slate-500">Rápido, sin IA. Actúa inmediatamente cuando hay coincidencia.</p>
          </div>
        </div>

        <div className="space-y-4">
          <PatternList
            title="Eliminar comentarios"
            description="Comentarios que coincidan serán eliminados permanentemente."
            icon={<ShieldAlert className="h-4 w-4" />}
            color="red"
            patterns={deleteKeywords}
            defaults={DEFAULT_DELETE_KEYWORDS}
            onAdd={addDelete}
            onRemove={removeDelete}
            onLoadDefaults={loadDeleteDefaults}
            saving={saving}
          />
          <PatternList
            title="Ocultar spam"
            description="Comentarios que coincidan serán ocultados (no eliminados)."
            icon={<EyeOff className="h-4 w-4" />}
            color="amber"
            patterns={spamKeywords}
            defaults={DEFAULT_SPAM_KEYWORDS}
            onAdd={addSpam}
            onRemove={removeSpam}
            onLoadDefaults={loadSpamDefaults}
            saving={saving}
          />
        </div>
      </div>

      {/* ── NIVEL 2 ── */}
      <div>
        <div className="flex items-center gap-3 mb-4">
          <div
            className="h-8 w-8 rounded-lg flex items-center justify-center flex-shrink-0"
            style={{ background: 'linear-gradient(135deg, #00C4D4, #00E5FF)' }}
          >
            <Brain className="h-4 w-4" style={{ color: '#0a1628' }} />
          </div>
          <div>
            <h2 className="text-sm font-bold text-slate-900">Nivel 2 — Instrucciones para la IA</h2>
            <p className="text-xs text-slate-500">
              Se aplica solo si el comentario no coincidió con ninguna palabra clave. La IA usará estas instrucciones para decidir.
            </p>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
          {/* Section title with dirty indicator */}
          <div className="flex items-center gap-2 mb-5">
            <h3 className="text-sm font-bold text-slate-900">Instrucciones para la IA</h3>
            {instrDirty && instrStatus === 'idle' && (
              <span className="h-2 w-2 rounded-full bg-amber-500 animate-pulse flex-shrink-0" title="Cambios sin guardar" />
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Delete instructions */}
            <div>
              <div className="flex items-center gap-2 mb-2">
                <div className="h-6 w-6 rounded-lg bg-red-100 flex items-center justify-center flex-shrink-0">
                  <ShieldAlert className="h-3 w-3 text-red-600" />
                </div>
                <Label className="text-xs font-bold text-slate-700">Instrucciones para ELIMINAR</Label>
              </div>
              <p className="text-xs text-slate-500 mb-2 leading-relaxed">
                Describe en lenguaje natural qué comentarios adicionales debe eliminar la IA.
              </p>
              <Textarea
                value={instrDraft.deleteInstructions}
                onChange={e => setInstrDraft(d => ({ ...d, deleteInstructions: e.target.value }))}
                placeholder="Ej: Elimina comentarios que comparen negativamente con la competencia, que mencionen problemas legales o que usen sarcasmo para atacar la marca."
                rows={5}
                className="resize-none text-sm leading-relaxed"
              />
            </div>

            {/* Spam instructions */}
            <div>
              <div className="flex items-center gap-2 mb-2">
                <div className="h-6 w-6 rounded-lg bg-amber-100 flex items-center justify-center flex-shrink-0">
                  <EyeOff className="h-3 w-3 text-amber-600" />
                </div>
                <Label className="text-xs font-bold text-slate-700">Instrucciones para OCULTAR (spam)</Label>
              </div>
              <p className="text-xs text-slate-500 mb-2 leading-relaxed">
                Describe qué comentarios adicionales debe ocultar la IA como spam.
              </p>
              <Textarea
                value={instrDraft.spamInstructions}
                onChange={e => setInstrDraft(d => ({ ...d, spamInstructions: e.target.value }))}
                placeholder="Ej: Oculta comentarios de cuentas sin foto de perfil que solo ponen emojis, o que mencionen otras constructoras."
                rows={5}
                className="resize-none text-sm leading-relaxed"
              />
            </div>
          </div>

          {/* Save bar */}
          <div className="flex items-center justify-between pt-4 mt-1 border-t border-slate-100">
            <div className="h-5 flex items-center">
              {instrStatus === 'idle' && instrDirty && (
                <span className="flex items-center gap-1.5 text-xs font-medium text-amber-600">
                  <span className="h-2 w-2 rounded-full bg-amber-500 animate-pulse" />
                  Cambios sin guardar
                </span>
              )}
              {instrStatus === 'saved' && (
                <span className="flex items-center gap-1.5 text-xs font-semibold text-emerald-600">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  Guardado
                </span>
              )}
            </div>
            <button
              onClick={() => void saveInstructions()}
              disabled={!instrDirty || instrStatus === 'saving'}
              className={`flex items-center gap-2 px-5 py-2.5 text-sm font-bold rounded-xl transition-all ${
                instrStatus === 'saving'
                  ? 'opacity-80 cursor-not-allowed'
                  : instrStatus === 'saved'
                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 cursor-default'
                  : instrDirty
                  ? 'text-white shadow-md hover:shadow-lg active:scale-95'
                  : 'bg-slate-100 text-slate-400 cursor-not-allowed'
              }`}
              style={
                (instrStatus === 'saving' || (instrStatus === 'idle' && instrDirty))
                  ? { background: 'linear-gradient(135deg, #00C4D4, #00E5FF)', color: '#0a1628' }
                  : undefined
              }
            >
              {instrStatus === 'saving' && <Loader2 className="h-4 w-4 animate-spin" />}
              {instrStatus === 'saved' && <CheckCircle2 className="h-4 w-4" />}
              {instrStatus === 'saving' ? 'Guardando...' : instrStatus === 'saved' ? 'Guardado' : 'Guardar cambios'}
            </button>
          </div>
        </div>

        {/* Processing order note */}
        <div className="mt-4 flex items-start gap-3 p-4 rounded-xl bg-cyan-50 border border-cyan-100">
          <Zap className="h-4 w-4 text-cyan-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-xs font-semibold text-cyan-900 mb-1">Orden de procesamiento</p>
            <p className="text-xs text-cyan-700 leading-relaxed">
              <strong>1.</strong> Primero se revisan las palabras clave — si hay coincidencia, se actúa inmediatamente sin usar IA.{' '}
              <strong>2.</strong> Si no hay coincidencia, la IA analiza el comentario usando las instrucciones del Nivel 2 junto con las instrucciones personalizadas del bot.
            </p>
          </div>
        </div>
      </div>

    </div>
  );
}
