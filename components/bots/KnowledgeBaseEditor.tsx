'use client';

import { useState } from 'react';
import { Trash2, Loader2, BookOpen, FileUp, Check, X, Edit3 } from 'lucide-react';
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
import { DocumentImporter } from '@/components/bots/DocumentImporter';

interface KnowledgeEntry {
  id: string;
  key: string;
  value: string;
  category: string | null;
  projectId: string | null;
  project?: { name: string } | null;
}

interface KnowledgeBaseEditorProps {
  botId: string;
  initialEntries: KnowledgeEntry[];
}

const CATEGORIES = ['pricing', 'location', 'contact', 'features', 'general'];

const CATEGORY_LABELS: Record<string, string> = {
  pricing: 'Precios',
  location: 'Ubicación',
  contact: 'Contacto',
  features: 'Características',
  general: 'General',
  // legacy Spanish keys
  precios: 'Precios',
  características: 'Características',
  ubicación: 'Ubicación',
  contacto: 'Contacto',
  financiamiento: 'Financiamiento',
};

const CATEGORY_COLORS: Record<string, string> = {
  pricing: 'bg-emerald-100 text-emerald-700',
  location: 'bg-blue-100 text-blue-700',
  contact: 'bg-violet-100 text-violet-700',
  features: 'bg-amber-100 text-amber-700',
  general: 'bg-slate-100 text-slate-600',
  precios: 'bg-emerald-100 text-emerald-700',
  características: 'bg-amber-100 text-amber-700',
  ubicación: 'bg-blue-100 text-blue-700',
  contacto: 'bg-violet-100 text-violet-700',
  financiamiento: 'bg-indigo-100 text-indigo-700',
};

export function KnowledgeBaseEditor({ botId, initialEntries }: KnowledgeBaseEditorProps) {
  const [entries, setEntries] = useState(initialEntries);
  const [showImporter, setShowImporter] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editKey, setEditKey] = useState('');
  const [editValue, setEditValue] = useState('');
  const [editCategory, setEditCategory] = useState('general');
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  async function handleImported() {
    try {
      const res = await fetch(`/api/bots/${botId}/knowledge`);
      const data = await res.json() as { entries: KnowledgeEntry[] };
      if (res.ok) setEntries(data.entries);
    } catch {
      // will refresh on next page load
    }
    setShowImporter(false);
  }

  function startEdit(entry: KnowledgeEntry) {
    setEditingId(entry.id);
    setEditKey(entry.key);
    setEditValue(entry.value);
    setEditCategory(entry.category ?? 'general');
  }

  function cancelEdit() {
    setEditingId(null);
  }

  async function saveEdit(entryId: string) {
    if (!editKey.trim() || !editValue.trim()) {
      toast.error('La clave y el valor son requeridos');
      return;
    }
    setSaving(true);
    try {
      const res = await fetch(`/api/bots/${botId}/knowledge?entryId=${entryId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key: editKey.trim(), value: editValue.trim(), category: editCategory }),
      });
      if (!res.ok) throw new Error();
      setEntries(prev =>
        prev.map(e =>
          e.id === entryId ? { ...e, key: editKey.trim(), value: editValue.trim(), category: editCategory } : e
        )
      );
      setEditingId(null);
      toast.success('Entrada actualizada');
    } catch {
      toast.error('Error al guardar los cambios');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(entryId: string) {
    setDeletingId(entryId);
    try {
      const res = await fetch(`/api/bots/${botId}/knowledge?entryId=${entryId}`, { method: 'DELETE' });
      if (!res.ok) throw new Error();
      setEntries(prev => prev.filter(e => e.id !== entryId));
      toast.success('Entrada eliminada');
    } catch {
      toast.error('Error al eliminar la entrada');
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div>
      {/* Header — only shown when there are entries */}
      {entries.length > 0 && (
        <div className="flex items-center justify-between mb-4">
          <p className="text-sm text-slate-500">
            {entries.length} entrada{entries.length !== 1 ? 's' : ''} en la base de conocimiento
          </p>
          <button
            onClick={() => setShowImporter(v => !v)}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-semibold rounded-xl transition-all shadow-sm ${
              showImporter
                ? 'bg-indigo-600 text-white shadow-md'
                : 'bg-white border border-slate-200 hover:border-indigo-300 hover:bg-indigo-50 text-slate-700'
            }`}
          >
            <FileUp className="h-4 w-4" />
            Importar documento
          </button>
        </div>
      )}

      {/* Document importer */}
      {showImporter && (
        <DocumentImporter botId={botId} onImported={() => void handleImported()} />
      )}

      {/* Empty state */}
      {entries.length === 0 && !showImporter && (
        <div className="flex flex-col items-center justify-center py-24 bg-white border border-slate-200 rounded-2xl shadow-sm">
          <div
            className="h-16 w-16 rounded-2xl flex items-center justify-center mb-5"
            style={{ background: 'linear-gradient(135deg, #e0e7ff 0%, #ede9fe 100%)' }}
          >
            <BookOpen className="h-8 w-8 text-indigo-500" />
          </div>
          <p className="text-base font-bold text-slate-900 mb-1">Sin conocimiento cargado</p>
          <p className="text-sm text-slate-500 text-center max-w-sm mb-6 leading-relaxed">
            Sube un documento para que la IA extraiga el conocimiento automáticamente.
          </p>
          <button
            onClick={() => setShowImporter(true)}
            className="flex items-center gap-2 px-5 py-3 text-white text-sm font-bold rounded-xl transition-all shadow-md hover:shadow-lg active:scale-95"
            style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)' }}
          >
            <FileUp className="h-4 w-4" />
            Importar documento
          </button>
        </div>
      )}

      {/* Empty state when importer is open */}
      {entries.length === 0 && showImporter && (
        <DocumentImporter botId={botId} onImported={() => void handleImported()} />
      )}

      {/* Entries table */}
      {entries.length > 0 && (
        <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50">
                <th className="text-left px-5 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wide w-1/4">Clave</th>
                <th className="text-left px-5 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wide">Valor</th>
                <th className="text-left px-5 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wide w-32">Categoría</th>
                <th className="px-5 py-3.5 w-24 text-right text-xs font-semibold text-slate-500 uppercase tracking-wide">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {entries.map((entry) => (
                <tr
                  key={entry.id}
                  className="border-b border-slate-100 last:border-0 group hover:bg-slate-50/70 transition-colors"
                >
                  {editingId === entry.id ? (
                    /* ── Edit mode ── */
                    <>
                      <td className="px-4 py-3">
                        <Input
                          value={editKey}
                          onChange={e => setEditKey(e.target.value)}
                          className="text-xs h-8"
                          autoFocus
                        />
                      </td>
                      <td className="px-4 py-3">
                        <Textarea
                          value={editValue}
                          onChange={e => setEditValue(e.target.value)}
                          className="text-xs resize-none min-h-[60px]"
                          rows={2}
                        />
                      </td>
                      <td className="px-4 py-3">
                        <Select value={editCategory} onValueChange={v => { if (v) setEditCategory(v); }}>
                          <SelectTrigger className="h-8 text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {CATEGORIES.map(c => (
                              <SelectItem key={c} value={c}>{CATEGORY_LABELS[c] ?? c}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => void saveEdit(entry.id)}
                            disabled={saving}
                            className="p-1.5 text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors disabled:opacity-50"
                            title="Guardar"
                          >
                            {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
                          </button>
                          <button
                            onClick={cancelEdit}
                            className="p-1.5 text-slate-500 hover:bg-slate-100 rounded-lg transition-colors"
                            title="Cancelar"
                          >
                            <X className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </td>
                    </>
                  ) : (
                    /* ── View mode ── */
                    <>
                      <td className="px-5 py-3.5 font-semibold text-slate-900">{entry.key}</td>
                      <td className="px-5 py-3.5 text-slate-600 max-w-xs">
                        <span className="line-clamp-2 leading-relaxed">{entry.value}</span>
                      </td>
                      <td className="px-5 py-3.5">
                        {entry.category && (
                          <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${CATEGORY_COLORS[entry.category] ?? 'bg-slate-100 text-slate-600'}`}>
                            {CATEGORY_LABELS[entry.category] ?? entry.category}
                          </span>
                        )}
                      </td>
                      <td className="px-5 py-3.5">
                        <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => startEdit(entry)}
                            className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                            title="Editar"
                          >
                            <Edit3 className="h-3.5 w-3.5" />
                          </button>
                          <AlertDialog>
                            <AlertDialogTrigger
                              disabled={deletingId === entry.id}
                              className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                              title="Eliminar"
                            >
                              {deletingId === entry.id ? (
                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                              ) : (
                                <Trash2 className="h-3.5 w-3.5" />
                              )}
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>¿Eliminar esta entrada?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  La IA ya no tendrá acceso a <strong>"{entry.key}"</strong> al generar respuestas.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => void handleDelete(entry.id)}
                                  className="bg-red-600 hover:bg-red-700 text-white"
                                >
                                  Eliminar
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </td>
                    </>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
