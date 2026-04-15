'use client';

import { useState, useEffect, useRef } from 'react';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  MessageSquare, Trash2, EyeOff, Zap, Loader2, CheckCircle2,
} from 'lucide-react';
import { toast } from 'sonner';

// ── Types ──────────────────────────────────────────────────────────────────────

interface Bot {
  id: string;
  name: string;
  isActive: boolean;
  autoReply: boolean;
  deleteNegative: boolean;
  hideSpam: boolean;
  aiEnabled: boolean;
  replyMaxChars: number;
  replyTone: string;
  language: string;
  systemInstructions: string | null;
  account: {
    platform: string;
    pageName: string;
  };
}

interface BotSettingsProps {
  bot: Bot;
}

type SaveStatus = 'idle' | 'saving' | 'saved';

// ── AI config draft shape ──────────────────────────────────────────────────────

interface AiDraft {
  replyTone: string;
  language: string;
  replyMaxChars: number;
  systemInstructions: string;
}

function draftFromBot(b: Bot): AiDraft {
  return {
    replyTone: b.replyTone,
    language: b.language,
    replyMaxChars: b.replyMaxChars,
    systemInstructions: b.systemInstructions ?? '',
  };
}

function isDraftDirty(a: AiDraft, b: AiDraft) {
  return (
    a.replyTone !== b.replyTone ||
    a.language !== b.language ||
    a.replyMaxChars !== b.replyMaxChars ||
    a.systemInstructions !== b.systemInstructions
  );
}

// ── Save bar sub-component ─────────────────────────────────────────────────────

function SaveBar({
  dirty,
  status,
  onSave,
}: {
  dirty: boolean;
  status: SaveStatus;
  onSave: () => void;
}) {
  return (
    <div className="flex items-center justify-between pt-4 mt-1 border-t border-slate-100">
      <div className="h-5 flex items-center">
        {status === 'idle' && dirty && (
          <span className="flex items-center gap-1.5 text-xs font-medium text-amber-600">
            <span className="h-2 w-2 rounded-full bg-amber-500 animate-pulse" />
            Cambios sin guardar
          </span>
        )}
        {status === 'saved' && (
          <span className="flex items-center gap-1.5 text-xs font-semibold text-emerald-600">
            <CheckCircle2 className="h-3.5 w-3.5" />
            Guardado
          </span>
        )}
      </div>
      <button
        onClick={onSave}
        disabled={!dirty || status === 'saving'}
        className={`flex items-center gap-2 px-5 py-2.5 text-sm font-bold rounded-xl transition-all ${
          status === 'saving'
            ? 'text-white opacity-80 cursor-not-allowed'
            : status === 'saved'
            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 cursor-default'
            : dirty
            ? 'text-white shadow-md hover:shadow-lg active:scale-95'
            : 'bg-slate-100 text-slate-400 cursor-not-allowed'
        }`}
        style={
          (status === 'saving' || (status === 'idle' && dirty))
            ? { background: 'linear-gradient(135deg, #00C4D4, #00E5FF)', color: '#0a1628' }
            : undefined
        }
      >
        {status === 'saving' && <Loader2 className="h-4 w-4 animate-spin" />}
        {status === 'saved' && <CheckCircle2 className="h-4 w-4" />}
        {status === 'saving' ? 'Guardando...' : status === 'saved' ? 'Guardado' : 'Guardar cambios'}
      </button>
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────

export function BotSettings({ bot }: BotSettingsProps) {
  const [data, setData] = useState(bot);
  const [savingToggle, setSavingToggle] = useState<string | null>(null);

  // AI config — controlled draft
  const [aiDraft, setAiDraft] = useState<AiDraft>(draftFromBot(bot));
  const [savedAi, setSavedAi] = useState<AiDraft>(draftFromBot(bot));
  const [aiStatus, setAiStatus] = useState<SaveStatus>('idle');
  const savedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const aiDirty = isDraftDirty(aiDraft, savedAi);

  useEffect(() => {
    return () => {
      if (savedTimerRef.current) clearTimeout(savedTimerRef.current);
    };
  }, []);

  // ── Toggles (instant save) ────────────────────────────────────────────────

  async function patchField(field: string, value: unknown) {
    setSavingToggle(field);
    try {
      const res = await fetch(`/api/bots/${bot.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ [field]: value }),
      });
      if (!res.ok) throw new Error();
    } catch {
      toast.error('Error al guardar. Inténtalo de nuevo.');
    } finally {
      setSavingToggle(null);
    }
  }

  async function handleToggle(field: string, value: boolean) {
    setData(d => ({ ...d, [field]: value }));
    await patchField(field, value);
  }

  // ── Name blur-save (still instant — it's a unique single field) ──────────

  function handleNameBlur(value: string) {
    void patchField('name', value);
  }

  // ── AI config — batch save ────────────────────────────────────────────────

  async function saveAiConfig() {
    if (!aiDirty || aiStatus === 'saving') return;
    setAiStatus('saving');
    try {
      const res = await fetch(`/api/bots/${bot.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          replyTone: aiDraft.replyTone,
          language: aiDraft.language,
          replyMaxChars: aiDraft.replyMaxChars,
          systemInstructions: aiDraft.systemInstructions,
        }),
      });
      if (!res.ok) throw new Error();
      setSavedAi({ ...aiDraft });
      setAiStatus('saved');
      savedTimerRef.current = setTimeout(() => setAiStatus('idle'), 2000);
    } catch {
      toast.error('Error al guardar. Inténtalo de nuevo.');
      setAiStatus('idle');
    }
  }

  const toggles = [
    {
      field: 'autoReply',
      label: 'Respuesta automática con IA',
      description: 'Genera y publica automáticamente respuestas de IA a los comentarios elegibles.',
      icon: <MessageSquare className="h-4 w-4" />,
      iconBg: 'bg-cyan-100',
      iconColor: 'text-cyan-600',
    },
    {
      field: 'deleteNegative',
      label: 'Eliminar comentarios negativos',
      description: 'Elimina los comentarios que coincidan con reglas de palabras clave ofensivas o negativas.',
      icon: <Trash2 className="h-4 w-4" />,
      iconBg: 'bg-red-100',
      iconColor: 'text-red-600',
    },
    {
      field: 'hideSpam',
      label: 'Ocultar comentarios spam',
      description: 'Oculta los comentarios que coincidan con reglas de palabras clave de spam.',
      icon: <EyeOff className="h-4 w-4" />,
      iconBg: 'bg-amber-100',
      iconColor: 'text-amber-600',
    },
    {
      field: 'aiEnabled',
      label: 'Moderación potenciada por IA',
      description: 'Usa IA para clasificar comentarios límite más allá de las reglas de palabras clave.',
      icon: <Zap className="h-4 w-4" />,
      iconBg: 'bg-cyan-100',
      iconColor: 'text-cyan-600',
    },
  ];

  return (
    <div className="space-y-5">

      {/* ── General ── */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
        <h2 className="text-sm font-semibold text-slate-900 uppercase tracking-wide mb-5">General</h2>
        <div className="space-y-5">
          <div>
            <Label className="text-sm font-medium text-slate-700 mb-1.5 block">Nombre del bot</Label>
            <Input
              defaultValue={data.name}
              onBlur={e => handleNameBlur(e.target.value)}
              className="max-w-xs"
            />
          </div>
          <div className="flex items-center justify-between border-2 border-cyan-200 bg-cyan-50 rounded-2xl p-6">
            <div>
              <p className="text-sm font-semibold text-cyan-900">Interruptor principal</p>
              <p className="text-xs text-cyan-600 mt-0.5">
                Cuando está apagado, este bot no procesará ningún comentario.
              </p>
            </div>
            <Switch
              checked={data.isActive}
              onCheckedChange={v => handleToggle('isActive', v)}
              className="data-[state=checked]:bg-cyan-500"
            />
          </div>
          <div className="text-sm text-slate-500 bg-slate-50 rounded-xl px-4 py-3 border border-slate-200">
            Conectado a{' '}
            <span className="font-medium text-slate-700">{data.account.pageName}</span>{' '}
            ({data.account.platform === 'FACEBOOK' ? 'Facebook' : data.account.platform === 'INSTAGRAM' ? 'Instagram' : data.account.platform.toLowerCase()})
          </div>
        </div>
      </div>

      {/* ── Automation toggles ── */}
      <div>
        <h2 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">Automatización</h2>
        <div className="space-y-3">
          {toggles.map((toggle) => (
            <div
              key={toggle.field}
              className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm flex items-start justify-between"
            >
              <div className="flex items-start gap-3">
                <div className={`mt-0.5 h-9 w-9 flex items-center justify-center rounded-xl flex-shrink-0 ${toggle.iconBg} ${toggle.iconColor}`}>
                  {toggle.icon}
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-900">{toggle.label}</p>
                  <p className="text-xs text-slate-500 mt-0.5 max-w-sm">{toggle.description}</p>
                </div>
              </div>
              <Switch
                checked={data[toggle.field as keyof Bot] as boolean}
                onCheckedChange={v => handleToggle(toggle.field, v)}
                disabled={savingToggle === toggle.field}
                className="ml-4 flex-shrink-0 data-[state=checked]:bg-cyan-500"
              />
            </div>
          ))}
        </div>
      </div>

      {/* ── AI Configuration ── */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
        {/* Section title with dirty indicator */}
        <div className="flex items-center gap-2 mb-5">
          <h2 className="text-sm font-semibold text-slate-900 uppercase tracking-wide">
            Configuración de IA
          </h2>
          {aiDirty && aiStatus === 'idle' && (
            <span className="h-2 w-2 rounded-full bg-amber-500 animate-pulse flex-shrink-0" title="Cambios sin guardar" />
          )}
        </div>

        <div className="space-y-5">
          {/* Tone + Language */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-sm font-medium text-slate-700 mb-1.5 block">Tono de respuesta</Label>
              <Select
                value={aiDraft.replyTone}
                onValueChange={v => { if (v) setAiDraft(d => ({ ...d, replyTone: v })); }}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="friendly">Amigable</SelectItem>
                  <SelectItem value="formal">Formal</SelectItem>
                  <SelectItem value="casual">Casual</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-sm font-medium text-slate-700 mb-1.5 block">Idioma</Label>
              <Select
                value={aiDraft.language}
                onValueChange={v => { if (v) setAiDraft(d => ({ ...d, language: v })); }}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="es">Español</SelectItem>
                  <SelectItem value="en">Inglés</SelectItem>
                  <SelectItem value="pt">Portugués</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Max chars */}
          <div>
            <Label className="text-sm font-medium text-slate-700 mb-1.5 block">
              Longitud máxima de respuesta (caracteres)
            </Label>
            <Input
              type="number"
              min={100}
              max={500}
              value={aiDraft.replyMaxChars}
              onChange={e => {
                const n = parseInt(e.target.value, 10);
                if (!isNaN(n)) setAiDraft(d => ({ ...d, replyMaxChars: n }));
              }}
              className="w-32"
            />
          </div>

          {/* Custom instructions */}
          <div>
            <Label className="text-sm font-medium text-slate-700 mb-1.5 block">
              Instrucciones personalizadas
            </Label>
            <Textarea
              value={aiDraft.systemInstructions}
              onChange={e => setAiDraft(d => ({ ...d, systemInstructions: e.target.value }))}
              placeholder="Ej: Nunca revelar fechas de entrega. Siempre redirigir preguntas de financiación a WhatsApp."
              rows={4}
              className="resize-none"
            />
            <p className="text-xs text-slate-400 mt-1.5">
              Estas instrucciones se inyectan directamente en el prompt de la IA.
            </p>
          </div>
        </div>

        {/* Save bar */}
        <SaveBar dirty={aiDirty} status={aiStatus} onSave={() => void saveAiConfig()} />
      </div>

    </div>
  );
}
