'use client';

import { useState } from 'react';
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
  MessageSquare, Trash2, EyeOff, Zap, Loader2,
} from 'lucide-react';
import { toast } from 'sonner';

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

export function BotSettings({ bot }: BotSettingsProps) {
  const [data, setData] = useState(bot);
  const [saving, setSaving] = useState<string | null>(null);

  async function patchBot(field: string, value: unknown) {
    setSaving(field);
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
      setSaving(null);
    }
  }

  async function handleToggle(field: string, value: boolean) {
    setData(d => ({ ...d, [field]: value }));
    await patchBot(field, value);
  }

  function handleTextBlur(field: string, value: string | number) {
    void patchBot(field, value);
  }

  const toggles = [
    {
      field: 'autoReply',
      label: 'Respuesta automática con IA',
      description: 'Genera y publica automáticamente respuestas de IA a los comentarios elegibles.',
      icon: <MessageSquare className="h-4 w-4" />,
      iconBg: 'bg-indigo-100',
      iconColor: 'text-indigo-600',
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
      iconBg: 'bg-violet-100',
      iconColor: 'text-violet-600',
    },
  ];

  return (
    <div className="space-y-5">
      {/* General */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
        <h2 className="text-sm font-semibold text-slate-900 uppercase tracking-wide mb-5">General</h2>
        <div className="space-y-5">
          <div>
            <Label className="text-sm font-medium text-slate-700 mb-1.5 block">Nombre del bot</Label>
            <Input
              defaultValue={data.name}
              onBlur={(e) => handleTextBlur('name', e.target.value)}
              className="max-w-xs"
            />
          </div>
          <div className="flex items-center justify-between border-2 border-indigo-200 bg-indigo-50 rounded-2xl p-6">
            <div>
              <p className="text-sm font-semibold text-indigo-900">Interruptor principal</p>
              <p className="text-xs text-indigo-600 mt-0.5">
                Cuando está apagado, este bot no procesará ningún comentario.
              </p>
            </div>
            <Switch
              checked={data.isActive}
              onCheckedChange={v => handleToggle('isActive', v)}
              className="data-[state=checked]:bg-indigo-600"
            />
          </div>
          <div className="text-sm text-slate-500 bg-slate-50 rounded-xl px-4 py-3 border border-slate-200">
            Conectado a{' '}
            <span className="font-medium text-slate-700">{data.account.pageName}</span>{' '}
            ({data.account.platform === 'FACEBOOK' ? 'Facebook' : data.account.platform === 'INSTAGRAM' ? 'Instagram' : data.account.platform.toLowerCase()})
          </div>
        </div>
      </div>

      {/* Automation Toggles */}
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
                  <p className="text-xs text-slate-500 mt-0.5 max-w-sm">
                    {toggle.description}
                  </p>
                </div>
              </div>
              <Switch
                checked={data[toggle.field as keyof Bot] as boolean}
                onCheckedChange={v => handleToggle(toggle.field, v)}
                disabled={saving === toggle.field}
                className="ml-4 flex-shrink-0 data-[state=checked]:bg-indigo-600"
              />
            </div>
          ))}
        </div>
      </div>

      {/* AI Configuration */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
        <h2 className="text-sm font-semibold text-slate-900 uppercase tracking-wide mb-5">Configuración de IA</h2>
        <div className="space-y-5">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-sm font-medium text-slate-700 mb-1.5 block">
                Tono de respuesta
              </Label>
              <Select
                defaultValue={data.replyTone}
                onValueChange={v => {
                  if (!v) return;
                  setData(d => ({ ...d, replyTone: v }));
                  void patchBot('replyTone', v);
                }}
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
              <Label className="text-sm font-medium text-slate-700 mb-1.5 block">
                Idioma
              </Label>
              <Select
                defaultValue={data.language}
                onValueChange={v => {
                  if (!v) return;
                  setData(d => ({ ...d, language: v }));
                  void patchBot('language', v);
                }}
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

          <div>
            <Label className="text-sm font-medium text-slate-700 mb-1.5 block">
              Longitud máxima de respuesta (caracteres)
            </Label>
            <Input
              type="number"
              min={100}
              max={500}
              defaultValue={data.replyMaxChars}
              onBlur={e => handleTextBlur('replyMaxChars', parseInt(e.target.value, 10))}
              className="w-32"
            />
          </div>

          <div>
            <Label className="text-sm font-medium text-slate-700 mb-1.5 block">
              Instrucciones personalizadas
            </Label>
            <Textarea
              defaultValue={data.systemInstructions ?? ''}
              onBlur={e => handleTextBlur('systemInstructions', e.target.value)}
              placeholder="Ej: Nunca revelar fechas de entrega. Siempre redirigir preguntas de financiación a WhatsApp."
              rows={4}
              className="resize-none"
            />
            <p className="text-xs text-slate-400 mt-1.5">
              Estas instrucciones se inyectan directamente en el prompt de la IA.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
