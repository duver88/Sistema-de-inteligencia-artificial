'use client';

import { useState, useRef, useCallback, DragEvent, ChangeEvent } from 'react';
import { Upload, FileText, X, Loader2, CheckSquare, Square, Cloud, Edit3 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';

interface ExtractedEntry {
  key: string;
  value: string;
  category: string;
  selected: boolean;
  editing: boolean;
}

interface DocumentImporterProps {
  botId: string;
  onImported: () => void;
}

const CATEGORY_LABELS: Record<string, string> = {
  pricing: 'Precios',
  location: 'Ubicación',
  contact: 'Contacto',
  features: 'Características',
  general: 'General',
};

const CATEGORY_COLORS: Record<string, string> = {
  pricing: 'bg-emerald-100 text-emerald-700',
  location: 'bg-blue-100 text-blue-700',
  contact: 'bg-violet-100 text-violet-700',
  features: 'bg-amber-100 text-amber-700',
  general: 'bg-slate-100 text-slate-600',
};

const ACCEPTED_EXTENSIONS = ['.pdf', '.txt', '.docx', '.xlsx', '.xls', '.csv'];
const ACCEPTED_MIME = [
  'application/pdf',
  'text/plain',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-excel',
  'text/csv',
  'application/csv',
];

export function DocumentImporter({ botId, onImported }: DocumentImporterProps) {
  const [phase, setPhase] = useState<'idle' | 'processing' | 'review' | 'importing'>('idle');
  const [entries, setEntries] = useState<ExtractedEntry[]>([]);
  const [dragOver, setDragOver] = useState(false);
  const [fileName, setFileName] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const processFile = useCallback(
    async (file: File) => {
      const ext = '.' + (file.name.split('.').pop() ?? '').toLowerCase();
      if (!ACCEPTED_EXTENSIONS.includes(ext)) {
        toast.error('Formato no soportado. Usa PDF, Word, Excel, TXT o CSV.');
        return;
      }
      if (file.size > 10 * 1024 * 1024) {
        toast.error('El archivo excede el límite de 10MB');
        return;
      }

      setFileName(file.name);
      setPhase('processing');

      const formData = new FormData();
      formData.append('file', file);

      try {
        const res = await fetch(`/api/bots/${botId}/knowledge/import`, {
          method: 'POST',
          body: formData,
        });
        const data = await res.json() as { entries?: ExtractedEntry[]; error?: string };
        if (!res.ok) throw new Error(data.error ?? 'Error desconocido');

        if (!data.entries || data.entries.length === 0) {
          toast.warning('No se encontraron datos útiles en el documento');
          setPhase('idle');
          return;
        }

        setEntries(
          data.entries.map((e) => ({
            ...e,
            selected: true,
            editing: false,
          }))
        );
        setPhase('review');
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Error al procesar el documento');
        setPhase('idle');
      }
    },
    [botId]
  );

  function handleDrop(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) void processFile(file);
  }

  function handleFileInput(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) void processFile(file);
    e.target.value = '';
  }

  function toggleEntry(idx: number) {
    setEntries((prev) =>
      prev.map((e, i) => (i === idx ? { ...e, selected: !e.selected } : e))
    );
  }

  function toggleAll() {
    const allSelected = entries.every((e) => e.selected);
    setEntries((prev) => prev.map((e) => ({ ...e, selected: !allSelected })));
  }

  function toggleEdit(idx: number) {
    setEntries((prev) =>
      prev.map((e, i) => (i === idx ? { ...e, editing: !e.editing } : e))
    );
  }

  function updateEntry(idx: number, field: keyof ExtractedEntry, val: string) {
    setEntries((prev) =>
      prev.map((e, i) => (i === idx ? { ...e, [field]: val } : e))
    );
  }

  async function handleConfirm() {
    const selected = entries.filter((e) => e.selected);
    if (selected.length === 0) {
      toast.error('Selecciona al menos una entrada para importar');
      return;
    }

    setPhase('importing');
    let imported = 0;

    for (const entry of selected) {
      try {
        const res = await fetch(`/api/bots/${botId}/knowledge`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            key: entry.key,
            value: entry.value,
            category: entry.category,
          }),
        });
        if (res.ok) imported++;
      } catch {
        // continue importing the rest
      }
    }

    toast.success(`${imported} entrada${imported !== 1 ? 's' : ''} importada${imported !== 1 ? 's' : ''} correctamente`);
    setPhase('idle');
    setEntries([]);
    setFileName('');
    onImported();
  }

  function handleCancel() {
    setPhase('idle');
    setEntries([]);
    setFileName('');
  }

  const selectedCount = entries.filter((e) => e.selected).length;

  // ── IDLE: drop zone ─────────────────────────────────────────────────────────
  if (phase === 'idle') {
    return (
      <div className="mb-6">
        <div
          onDrop={handleDrop}
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onClick={() => fileInputRef.current?.click()}
          className={`relative flex flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed p-10 cursor-pointer transition-all duration-200 ${
            dragOver
              ? 'border-indigo-400 bg-indigo-50'
              : 'border-slate-200 bg-slate-50 hover:border-indigo-300 hover:bg-indigo-50/50'
          }`}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept={ACCEPTED_MIME.join(',')}
            className="hidden"
            onChange={handleFileInput}
          />
          <div
            className="h-14 w-14 rounded-2xl flex items-center justify-center"
            style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)' }}
          >
            <Upload className="h-6 w-6 text-white" />
          </div>
          <div className="text-center">
            <p className="text-sm font-semibold text-slate-900">
              Arrastra tu documento aquí o haz clic para seleccionar
            </p>
            <p className="text-xs text-slate-500 mt-1">
              PDF, Word (DOCX), Excel (XLSX), CSV, TXT · Máximo 10MB
            </p>
          </div>
          <div className="flex items-center gap-4 mt-1">
            {['PDF', 'Word', 'Excel', 'CSV', 'TXT'].map((fmt) => (
              <span
                key={fmt}
                className="px-2.5 py-1 rounded-lg bg-white border border-slate-200 text-xs font-semibold text-slate-600 shadow-sm"
              >
                {fmt}
              </span>
            ))}
          </div>
        </div>

        {/* Coming soon note */}
        <div className="mt-3 flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-100 border border-slate-200">
          <Cloud className="h-4 w-4 text-slate-400 flex-shrink-0" />
          <p className="text-xs text-slate-500">
            <span className="font-semibold text-slate-600">Google Drive</span> estará disponible próximamente.
          </p>
        </div>
      </div>
    );
  }

  // ── PROCESSING ───────────────────────────────────────────────────────────────
  if (phase === 'processing') {
    return (
      <div className="mb-6 flex flex-col items-center justify-center gap-4 rounded-2xl border-2 border-dashed border-indigo-200 bg-indigo-50 p-12">
        <div className="relative">
          <div
            className="h-14 w-14 rounded-2xl flex items-center justify-center"
            style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)' }}
          >
            <FileText className="h-6 w-6 text-white" />
          </div>
          <Loader2 className="absolute -bottom-1 -right-1 h-5 w-5 text-indigo-600 animate-spin bg-white rounded-full" />
        </div>
        <div className="text-center">
          <p className="text-sm font-semibold text-indigo-900">Procesando documento con IA…</p>
          <p className="text-xs text-indigo-600 mt-1">{fileName}</p>
          <p className="text-xs text-slate-500 mt-2">Extrayendo y clasificando el conocimiento del archivo</p>
        </div>
      </div>
    );
  }

  // ── REVIEW ───────────────────────────────────────────────────────────────────
  if (phase === 'review') {
    return (
      <div className="mb-6 bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
        {/* Header */}
        <div
          className="px-5 py-4 border-b border-slate-100 flex items-center justify-between"
          style={{ background: 'linear-gradient(135deg, #f5f3ff 0%, #ede9fe 100%)' }}
        >
          <div>
            <p className="text-sm font-bold text-slate-900">
              {entries.length} entrada{entries.length !== 1 ? 's' : ''} extraída{entries.length !== 1 ? 's' : ''} de IA
            </p>
            <p className="text-xs text-slate-500 mt-0.5">
              Revisa y edita antes de importar · {fileName}
            </p>
          </div>
          <button
            onClick={handleCancel}
            className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-white/80 rounded-lg transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Select all bar */}
        <div className="px-5 py-2.5 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
          <button
            onClick={toggleAll}
            className="flex items-center gap-2 text-xs font-semibold text-slate-600 hover:text-indigo-600 transition-colors"
          >
            {entries.every((e) => e.selected) ? (
              <CheckSquare className="h-4 w-4 text-indigo-600" />
            ) : (
              <Square className="h-4 w-4" />
            )}
            {entries.every((e) => e.selected) ? 'Deseleccionar todo' : 'Seleccionar todo'}
          </button>
          <span className="text-xs text-slate-500">
            {selectedCount} de {entries.length} seleccionadas
          </span>
        </div>

        {/* Entries list */}
        <div className="max-h-96 overflow-y-auto divide-y divide-slate-100">
          {entries.map((entry, idx) => (
            <div
              key={idx}
              className={`px-5 py-3 transition-colors ${entry.selected ? 'bg-white' : 'bg-slate-50 opacity-50'}`}
            >
              {entry.editing ? (
                /* Edit mode */
                <div className="space-y-2">
                  <div className="grid grid-cols-2 gap-2">
                    <Input
                      value={entry.key}
                      onChange={(e) => updateEntry(idx, 'key', e.target.value)}
                      className="text-xs h-8"
                      placeholder="Clave"
                    />
                    <Select
                      value={entry.category}
                      onValueChange={(v) => { if (v) updateEntry(idx, 'category', v); }}
                    >
                      <SelectTrigger className="h-8 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(CATEGORY_LABELS).map(([k, label]) => (
                          <SelectItem key={k} value={k}>{label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <Textarea
                    value={entry.value}
                    onChange={(e) => updateEntry(idx, 'value', e.target.value)}
                    className="text-xs resize-none"
                    rows={2}
                    placeholder="Valor"
                  />
                  <button
                    onClick={() => toggleEdit(idx)}
                    className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 transition-colors"
                  >
                    Listo
                  </button>
                </div>
              ) : (
                /* View mode */
                <div className="flex items-start gap-3">
                  <button onClick={() => toggleEntry(idx)} className="mt-0.5 flex-shrink-0">
                    {entry.selected ? (
                      <CheckSquare className="h-4 w-4 text-indigo-600" />
                    ) : (
                      <Square className="h-4 w-4 text-slate-400" />
                    )}
                  </button>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="text-xs font-semibold text-slate-900 truncate">{entry.key}</span>
                      <span
                        className={`px-2 py-0.5 rounded-full text-xs font-medium flex-shrink-0 ${
                          CATEGORY_COLORS[entry.category] ?? 'bg-slate-100 text-slate-600'
                        }`}
                      >
                        {CATEGORY_LABELS[entry.category] ?? entry.category}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 line-clamp-2">{entry.value}</p>
                  </div>
                  <button
                    onClick={() => toggleEdit(idx)}
                    className="flex-shrink-0 p-1 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                    title="Editar"
                  >
                    <Edit3 className="h-3.5 w-3.5" />
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Footer actions */}
        <div className="px-5 py-4 border-t border-slate-100 bg-slate-50 flex items-center justify-between gap-3">
          <button
            onClick={handleCancel}
            className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-200 rounded-xl transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={() => void handleConfirm()}
            disabled={selectedCount === 0}
            className="flex items-center gap-2 px-5 py-2 text-white text-sm font-bold rounded-xl transition-all shadow-md hover:shadow-lg active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
            style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)' }}
          >
            Confirmar e importar {selectedCount > 0 ? `(${selectedCount})` : ''}
          </button>
        </div>
      </div>
    );
  }

  // ── IMPORTING ────────────────────────────────────────────────────────────────
  return (
    <div className="mb-6 flex flex-col items-center justify-center gap-3 rounded-2xl border border-indigo-200 bg-indigo-50 p-10">
      <Loader2 className="h-8 w-8 text-indigo-600 animate-spin" />
      <p className="text-sm font-semibold text-indigo-900">Guardando entradas…</p>
    </div>
  );
}
