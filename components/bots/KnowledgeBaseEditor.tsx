'use client';

import { useState } from 'react';
import { Plus, Trash2, Loader2, BookOpen } from 'lucide-react';
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

const CATEGORIES = ['pricing', 'features', 'location', 'contact', 'financing', 'general'];

export function KnowledgeBaseEditor({
  botId,
  initialEntries,
  projects,
}: KnowledgeBaseEditorProps) {
  const [entries, setEntries] = useState(initialEntries);
  const [adding, setAdding] = useState(false);
  const [newKey, setNewKey] = useState('');
  const [newValue, setNewValue] = useState('');
  const [newCategory, setNewCategory] = useState('general');
  const [newProjectId, setNewProjectId] = useState('');
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  async function handleAdd() {
    if (!newKey.trim() || !newValue.trim()) {
      toast.error('Key and value are required');
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
      toast.success('Entry added');
    } catch {
      toast.error('Failed to add entry');
    } finally {
      setSaving(false);
    }
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
      toast.success('Entry deleted');
    } catch {
      toast.error('Failed to delete entry');
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div />
        <button
          onClick={() => setAdding(v => !v)}
          className="flex items-center gap-2 px-3 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-xl transition-colors"
        >
          <Plus className="h-4 w-4" />
          Add Entry
        </button>
      </div>

      {/* Add form */}
      {adding && (
        <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-4 mb-4 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-sm font-medium text-slate-700 mb-1 block">Key</Label>
              <Input
                placeholder="e.g. Precio desde"
                value={newKey}
                onChange={e => setNewKey(e.target.value)}
              />
            </div>
            <div>
              <Label className="text-sm font-medium text-slate-700 mb-1 block">Category</Label>
              <Select value={newCategory} onValueChange={v => { if (v) setNewCategory(v); }}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map(c => (
                    <SelectItem key={c} value={c} className="capitalize">{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div>
            <Label className="text-sm font-medium text-slate-700 mb-1 block">Value</Label>
            <Textarea
              placeholder="e.g. $180,000,000 COP"
              value={newValue}
              onChange={e => setNewValue(e.target.value)}
              rows={2}
              className="resize-none"
            />
          </div>
          {projects.length > 0 && (
            <div>
              <Label className="text-sm font-medium text-slate-700 mb-1 block">Project (optional)</Label>
              <Select value={newProjectId} onValueChange={v => setNewProjectId(v ?? '')}>
                <SelectTrigger>
                  <SelectValue placeholder="Global (all projects)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Global (all projects)</SelectItem>
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
              className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50"
            >
              {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
              Save
            </button>
            <button
              onClick={() => setAdding(false)}
              className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Entries table */}
      {entries.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16">
          <div className="h-12 w-12 bg-slate-100 rounded-xl flex items-center justify-center mb-3">
            <BookOpen className="h-6 w-6 text-slate-400" />
          </div>
          <p className="text-sm font-semibold text-slate-900 mb-1">No entries yet</p>
          <p className="text-xs text-slate-500 text-center max-w-xs">
            Add knowledge entries so the AI can answer questions accurately.
          </p>
        </div>
      ) : (
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50">
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-600 uppercase tracking-wide">Key</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-600 uppercase tracking-wide">Value</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-600 uppercase tracking-wide">Category</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-600 uppercase tracking-wide">Project</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {entries.map((entry, i) => (
                <tr
                  key={entry.id}
                  className={`border-b border-slate-100 last:border-0 ${i % 2 === 0 ? '' : 'bg-slate-50/50'}`}
                >
                  <td className="px-4 py-3 font-medium text-slate-900">{entry.key}</td>
                  <td className="px-4 py-3 text-slate-600 max-w-xs">
                    <span className="line-clamp-2">{entry.value}</span>
                  </td>
                  <td className="px-4 py-3">
                    {entry.category && (
                      <span className="px-2 py-0.5 rounded-md text-xs font-medium bg-slate-100 text-slate-600 capitalize">
                        {entry.category}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-500">
                    {entry.project?.name ?? 'Global'}
                  </td>
                  <td className="px-4 py-3 text-right">
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
                          <AlertDialogTitle>Delete this entry?</AlertDialogTitle>
                          <AlertDialogDescription>
                            The AI will no longer have access to this information when generating replies.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => handleDelete(entry.id)}
                            className="bg-red-600 hover:bg-red-700 text-white"
                          >
                            Delete
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
