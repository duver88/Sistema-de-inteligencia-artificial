'use client';

import { useState } from 'react';
import { Plus, Trash2, Loader2, BookOpen, FileUp } from 'lucide-react';
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

interface Project {
  id: string;
  name: string;
}

interface KnowledgeBaseEditorProps {
  botId: string;
  initialEntries: KnowledgeEntry[];
  projects: Project[];
}

const CATEGORIES = ['precios', 'características', 'ubicación', 'contacto', 'financiamiento', 'general'];
const CATEGORY_LABELS: Record<string, string> = {
  precios: 'Precios',
  características: 'Características',
  ubicación: 'Ubicación',
  contacto: 'Contacto',
  financiamiento: 'Financiamiento',
  general: 'General',
  pricing: 'Precios',
  features: 'Características',
  location: 'Ubicación',
  contact: 'Contacto',
  financing: 'Financiamiento',
};

export function KnowledgeBaseEditor({
  botId,
  initialEntries,
  projects,
}: KnowledgeBaseEditorProps) {
  const [entries, setEntries] = useState(initialEntries);
  const [adding, setAdding] = useState(false);
  const [showImporter, setShowImporter] = useState(false);
  const [newKey, setNewKey] = useState('');
  const [newValue, setNewValue] = useState('');
  const [newCategory, setNewCategory] = useState('general');
  const [newProjectId, setNewProjectId] = useState('');
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  async function handleAdd() {
    if (!newKey.trim() || !newValue.trim()) {
      toast.error('La clave y el valor son requeridos');
      return;
    }
    setSaving(true);
    try {
      const res = await fetch(`/api/bots/${botId}/knowledge`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          key: newKey.trim(),
          value: newValue.trim(),
          category: newCategory,
          projectId: newProjectId || undefined,
        }),
      });
      const data = await res.json() as { entry: KnowledgeEntry };
      if (!res.ok) throw new Error();
      setEntries(prev => [...prev, data.entry]);
      setNewKey('');
      setNewValue('');
      setAdding(false);
      toast.success('Entrada agregada');
    } catch {
      toast.error('Error al agregar la entrada');
    } finally {
      setSaving(false);
    }
  }

  async function handleImported() {
    // Re-fetch entries after bulk import
    try {
      const res = await fetch(`/api/bots/${botId}/knowledge`);
      const data = await res.json() as { entries: KnowledgeEntry[] };
      if (res.ok) setEntries(data.entries);
    } catch {
      // Silently fail — entries will refresh on next page load
    }
    setShowImporter(false);
  }

  async function handleDelete(entryId: string) {
    setDeletingId(entryId);
    try {
      const res = await fetch(
        `/api/bots/${botId}/knowledge?entryId=${entryId}`,
        { method: 'DELETE' }
      );
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
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div />
        <div className="flex items-center gap-2">
          <button
            onClick={() => { setShowImporter(v => !v); setAdding(false); }}
            className="flex items-center gap-2 px-4 py-2.5 bg-white border border-slate-200 hover:border-indigo-300 hover:bg-indigo-50 text-slate-700 text-sm font-semibold rounded-xl transition-all shadow-sm"
          >
            <FileUp className="h-4 w-4 text-indigo-600" />
            Importar documento
          </button>
          <button
            onClick={() => { setAdding(v => !v); setShowImporter(false); }}
            className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-700 hover:to-indigo-600 text-white text-sm font-medium rounded-xl transition-all shadow-sm hover:shadow-md"
          >
            <Plus className="h-4 w-4" />
            Agregar Entrada
          </button>
        </div>
      </div>

      {/* Document importer */}
      {showImporter && (
        <DocumentImporter botId={botId} onImported={() => void handleImported()} />
      )}

      {/* Add form */}
      {adding && (
        <div className="bg-indigo-50 border border-indigo-200 rounded-2xl p-5 mb-4 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-sm font-medium text-slate-700 mb-1 block">Clave</Label>
              <Input
                placeholder="Ej: Precio desde"
                value={newKey}
                onChange={e => setNewKey(e.target.value)}
              />
            </div>
            <div>
              <Label className="text-sm font-medium text-slate-700 mb-1 block">Categoría</Label>
              <Select value={newCategory} onValueChange={v => { if (v) setNewCategory(v); }}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map(c => (
                    <SelectItem key={c} value={c}>{CATEGORY_LABELS[c] ?? c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div>
            <Label className="text-sm font-medium text-slate-700 mb-1 block">Valor</Label>
            <Textarea
              placeholder="Ej: $180,000,000 COP"
              value={newValue}
              onChange={e => setNewValue(e.target.value)}
              rows={2}
              className="resize-none"
            />
          </div>
          {projects.length > 0 && (
            <div>
              <Label className="text-sm font-medium text-slate-700 mb-1 block">Proyecto (opcional)</Label>
              <Select value={newProjectId} onValueChange={v => setNewProjectId(v ?? '')}>
                <SelectTrigger>
                  <SelectValue placeholder="Global (todos los proyectos)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Global (todos los proyectos)</SelectItem>
                  {projects.map(p => (
                    <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          <div className="flex gap-2">
            <button
              onClick={handleAdd}
              disabled={saving}
              className="flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-700 hover:to-indigo-600 text-white text-sm font-medium rounded-xl transition-all disabled:opacity-50"
            >
              {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
              Guardar
            </button>
            <button
              onClick={() => setAdding(false)}
              className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}

      {/* Entries table */}
      {entries.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 bg-white border border-slate-200 rounded-2xl shadow-sm">
          <div className="h-14 w-14 bg-slate-100 rounded-2xl flex items-center justify-center mb-4">
            <BookOpen className="h-7 w-7 text-slate-400" />
          </div>
          <p className="text-sm font-semibold text-slate-900 mb-1">Sin entradas aún</p>
          <p className="text-xs text-slate-500 text-center max-w-xs">
            Agrega entradas de conocimiento para que la IA pueda responder preguntas con precisión.
          </p>
        </div>
      ) : (
        <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50">
                <th className="text-left px-5 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wide">Clave</th>
                <th className="text-left px-5 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wide">Valor</th>
                <th className="text-left px-5 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wide">Categoría</th>
                <th className="text-left px-5 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wide">Proyecto</th>
                <th className="px-5 py-3.5" />
              </tr>
            </thead>
            <tbody>
              {entries.map((entry, i) => (
                <tr
                  key={entry.id}
                  className={`border-b border-slate-100 last:border-0 ${i % 2 === 0 ? '' : 'bg-slate-50/50'}`}
                >
                  <td className="px-5 py-3.5 font-medium text-slate-900">{entry.key}</td>
                  <td className="px-5 py-3.5 text-slate-600 max-w-xs">
                    <span className="line-clamp-2">{entry.value}</span>
                  </td>
                  <td className="px-5 py-3.5">
                    {entry.category && (
                      <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-600">
                        {CATEGORY_LABELS[entry.category] ?? entry.category}
                      </span>
                    )}
                  </td>
                  <td className="px-5 py-3.5 text-xs text-slate-500">
                    {entry.project?.name ?? 'Global'}
                  </td>
                  <td className="px-5 py-3.5 text-right">
                    <AlertDialog>
                      <AlertDialogTrigger
                        disabled={deletingId === entry.id}
                        className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
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
                            La IA ya no tendrá acceso a esta información al generar respuestas.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancelar</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => handleDelete(entry.id)}
                            className="bg-red-600 hover:bg-red-700 text-white"
                          >
                            Eliminar
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
