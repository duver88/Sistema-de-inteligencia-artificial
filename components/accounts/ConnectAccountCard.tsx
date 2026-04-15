'use client';

import { useState } from 'react';
import { FacebookIcon } from '@/components/icons/FacebookIcon';
import { InstagramIcon } from '@/components/icons/InstagramIcon';
import { CheckCircle2, Loader2, Plus } from 'lucide-react';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface Page {
  id: string;
  name: string;
  access_token: string;
  picture?: { data?: { url?: string } };
  instagram_business_account?: {
    id: string;
    name: string;
    profile_picture_url?: string;
  };
}

interface ConnectAccountCardProps {
  onConnected: () => void;
}

export function ConnectAccountCard({ onConnected }: ConnectAccountCardProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [pages, setPages] = useState<Page[]>([]);
  const [connecting, setConnecting] = useState<string | null>(null);

  async function loadPages() {
    setLoading(true);
    try {
      const res = await fetch('/api/meta/pages');
      const data = await res.json() as { pages?: Page[]; error?: string };
      if (!res.ok) throw new Error(data.error ?? 'Error al cargar páginas');
      setPages(data.pages ?? []);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error al cargar páginas');
      setOpen(false);
    } finally {
      setLoading(false);
    }
  }

  function handleOpen() {
    setOpen(true);
    void loadPages();
  }

  async function connectPage(page: Page) {
    setConnecting(page.id);
    try {
      const res = await fetch('/api/accounts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pageId: page.id,
          pageName: page.name,
          pageToken: page.access_token,
          pictureUrl: page.picture?.data?.url,
          platform: 'FACEBOOK',
        }),
      });
      if (!res.ok) throw new Error('Error al conectar la página');

      if (page.instagram_business_account) {
        const ig = page.instagram_business_account;
        await fetch('/api/accounts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            pageId: ig.id,
            pageName: ig.name,
            pageToken: page.access_token,
            pictureUrl: ig.profile_picture_url,
            platform: 'INSTAGRAM',
            linkedFacebookPageId: page.id,
          }),
        });
      }

      toast.success(`${page.name} conectada exitosamente`);
      onConnected();
      setOpen(false);
    } catch {
      toast.error('Error al conectar la página. Inténtalo de nuevo.');
    } finally {
      setConnecting(null);
    }
  }

  return (
    <>
      <button
        onClick={handleOpen}
        className="inline-flex items-center gap-2 px-4 py-2.5 text-white text-sm font-bold rounded-xl transition-all shadow-md hover:shadow-lg active:scale-95"
        style={{background: 'linear-gradient(135deg, #6366f1, #8b5cf6)'}}
      >
        <Plus className="h-4 w-4" />
        Conectar Cuenta
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Conectar una Página de Facebook</DialogTitle>
          </DialogHeader>

          {loading ? (
            <div className="py-14 flex flex-col items-center gap-3">
              <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
              <p className="text-sm text-slate-500">Cargando tus páginas…</p>
            </div>
          ) : pages.length === 0 ? (
            <div className="py-14 text-center">
              <p className="text-sm text-slate-500">No se encontraron páginas de Facebook.</p>
              <p className="text-xs text-slate-400 mt-1">Asegúrate de administrar al menos una Página.</p>
            </div>
          ) : (
            <div className="space-y-2 max-h-80 overflow-y-auto">
              {pages.map(page => (
                <div
                  key={page.id}
                  className="flex items-center justify-between p-3.5 border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    {page.picture?.data?.url ? (
                      <img src={page.picture.data.url} alt={page.name} className="h-10 w-10 rounded-full object-cover" />
                    ) : (
                      <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                        <FacebookIcon className="h-4 w-4 text-blue-600" />
                      </div>
                    )}
                    <div>
                      <p className="text-sm font-semibold text-slate-900">{page.name}</p>
                      {page.instagram_business_account && (
                        <p className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                          <InstagramIcon className="h-3 w-3 text-pink-600" />
                          {page.instagram_business_account.name}
                        </p>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={() => connectPage(page)}
                    disabled={connecting === page.id}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-white text-xs font-bold rounded-lg transition-all disabled:opacity-50 active:scale-95"
                    style={{background: 'linear-gradient(135deg, #6366f1, #8b5cf6)'}}
                  >
                    {connecting === page.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
                    Conectar
                  </button>
                </div>
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
