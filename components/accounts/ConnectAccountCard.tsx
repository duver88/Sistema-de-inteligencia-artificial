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
      if (!res.ok) throw new Error(data.error ?? 'Failed to load pages');
      setPages(data.pages ?? []);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to load pages');
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
      if (!res.ok) throw new Error('Failed to connect page');

      // Also connect linked Instagram account if present
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

      toast.success(`${page.name} connected successfully`);
      onConnected();
      setOpen(false);
    } catch {
      toast.error('Failed to connect page. Please try again.');
    } finally {
      setConnecting(null);
    }
  }

  return (
    <>
      <button
        onClick={handleOpen}
        className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-xl transition-colors"
      >
        <Plus className="h-4 w-4" />
        Connect Account
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Connect a Facebook Page</DialogTitle>
          </DialogHeader>

          {loading ? (
            <div className="py-12 flex flex-col items-center gap-3">
              <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
              <p className="text-sm text-slate-500">Loading your pages…</p>
            </div>
          ) : pages.length === 0 ? (
            <div className="py-12 text-center">
              <p className="text-sm text-slate-500">No Facebook Pages found.</p>
              <p className="text-xs text-slate-400 mt-1">
                Make sure you manage at least one Facebook Page.
              </p>
            </div>
          ) : (
            <div className="space-y-2 max-h-80 overflow-y-auto">
              {pages.map(page => (
                <div
                  key={page.id}
                  className="flex items-center justify-between p-3 border border-slate-200 rounded-xl hover:bg-slate-50"
                >
                  <div className="flex items-center gap-3">
                    {page.picture?.data?.url ? (
                      <img
                        src={page.picture.data.url}
                        alt={page.name}
                        className="h-9 w-9 rounded-full object-cover"
                      />
                    ) : (
                      <div className="h-9 w-9 rounded-full bg-blue-100 flex items-center justify-center">
                        <FacebookIcon className="h-4 w-4 text-blue-600" />
                      </div>
                    )}
                    <div>
                      <p className="text-sm font-medium text-slate-900">{page.name}</p>
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
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-medium rounded-lg transition-colors disabled:opacity-50"
                  >
                    {connecting === page.id ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <CheckCircle2 className="h-3.5 w-3.5" />
                    )}
                    Connect
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
