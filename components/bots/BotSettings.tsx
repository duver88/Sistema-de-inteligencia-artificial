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
  MessageSquare, Trash2, EyeOff, Zap, CheckCircle2, Loader2,
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
      toast.error('Failed to save. Please try again.');
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
      label: 'Auto-reply with AI',
      description: 'Automatically generate and post AI replies to eligible comments.',
      icon: <MessageSquare className="h-4 w-4" />,
    },
    {
      field: 'deleteNegative',
      label: 'Delete negative comments',
      description: 'Delete comments that match offensive or negative keyword rules.',
      icon: <Trash2 className="h-4 w-4" />,
    },
    {
      field: 'hideSpam',
      label: 'Hide spam comments',
      description: 'Hide comments that match spam keyword rules.',
      icon: <EyeOff className="h-4 w-4" />,
    },
    {
      field: 'aiEnabled',
      label: 'AI-powered moderation',
      description: 'Use Claude AI to classify borderline comments beyond keyword rules.',
      icon: <Zap className="h-4 w-4" />,
    },
  ];

  return (
    <div className="space-y-6">
      {/* General */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
        <h2 className="text-base font-semibold text-slate-900 mb-4">General</h2>
        <div className="space-y-4">
          <div>
            <Label className="text-sm font-medium text-slate-700 mb-1.5 block">Bot name</Label>
            <Input
              defaultValue={data.name}
              onBlur={(e) => handleTextBlur('name', e.target.value)}
              className="max-w-xs"
            />
          </div>
          <div className="flex items-center justify-between py-2">
            <div>
              <p className="text-sm font-medium text-slate-900">Master switch</p>
              <p className="text-xs text-slate-500 mt-0.5">
                When off, this bot will not process any comments.
              </p>
            </div>
            <Switch
              checked={data.isActive}
              onCheckedChange={v => handleToggle('isActive', v)}
              className="data-[state=checked]:bg-indigo-600"
            />
          </div>
          <div className="text-sm text-slate-500 bg-slate-50 rounded-lg px-3 py-2">
            Connected to{' '}
            <span className="font-medium text-slate-700">{data.account.pageName}</span>{' '}
            ({data.account.platform.toLowerCase()})
          </div>
        </div>
      </div>

      {/* Automation Toggles */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
        <h2 className="text-base font-semibold text-slate-900 mb-2">Automation</h2>
        <div>
          {toggles.map((toggle) => (
            <div
              key={toggle.field}
              className="flex items-start justify-between py-4 border-b border-slate-100 last:border-0"
            >
              <div className="flex items-start gap-3">
                <div className="mt-0.5 h-8 w-8 flex items-center justify-center rounded-lg bg-slate-100 text-slate-600">
                  {toggle.icon}
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-900">{toggle.label}</p>
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
      <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
        <h2 className="text-base font-semibold text-slate-900 mb-4">AI Configuration</h2>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-sm font-medium text-slate-700 mb-1.5 block">
                Reply tone
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
                  <SelectItem value="friendly">Friendly</SelectItem>
                  <SelectItem value="formal">Formal</SelectItem>
                  <SelectItem value="casual">Casual</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-sm font-medium text-slate-700 mb-1.5 block">
                Language
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
                  <SelectItem value="es">Spanish</SelectItem>
                  <SelectItem value="en">English</SelectItem>
                  <SelectItem value="pt">Portuguese</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label className="text-sm font-medium text-slate-700 mb-1.5 block">
              Max reply length (characters)
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
              Custom instructions
            </Label>
            <Textarea
              defaultValue={data.systemInstructions ?? ''}
              onBlur={e => handleTextBlur('systemInstructions', e.target.value)}
              placeholder="e.g. Never reveal delivery dates. Always redirect financing questions to WhatsApp."
              rows={4}
              className="resize-none"
            />
            <p className="text-xs text-slate-400 mt-1">
              These instructions are injected directly into the AI prompt.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
