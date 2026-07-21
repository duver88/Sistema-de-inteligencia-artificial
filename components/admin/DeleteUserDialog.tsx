'use client';

import { useState } from 'react';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import type { AdminUser } from './types';

interface DeleteUserDialogProps {
  user: AdminUser | null;
  onOpenChange: (open: boolean) => void;
  onDeleted: (userId: string) => void;
}

export function DeleteUserDialog({ user, onOpenChange, onDeleted }: DeleteUserDialogProps) {
  const [deleting, setDeleting] = useState(false);

  async function handleDelete() {
    if (!user || deleting) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/admin/users/${user.id}`, { method: 'DELETE' });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(data.error ?? 'Failed to delete user');
        return;
      }
      if (data.tenantDeleted) {
        toast.success('User and their empty tenant deleted');
      } else if (data.tenantOrphaned) {
        toast.success('User deleted. Their tenant still has connected data and was kept.');
      } else {
        toast.success('User deleted');
      }
      onDeleted(user.id);
      onOpenChange(false);
    } catch {
      toast.error('Failed to delete user');
    } finally {
      setDeleting(false);
    }
  }

  return (
    <AlertDialog open={!!user} onOpenChange={onOpenChange}>
      <AlertDialogContent className="bg-white">
        <AlertDialogHeader>
          <AlertDialogTitle>
            Delete {user?.name ?? user?.email ?? 'user'}?
          </AlertDialogTitle>
          <AlertDialogDescription>
            This permanently removes the user&apos;s account and login access.
            If they are the only member of their tenant and the tenant has no
            connected pages, the tenant is deleted too. This action cannot be
            undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
          <button
            type="button"
            onClick={() => void handleDelete()}
            disabled={deleting}
            className="inline-flex items-center justify-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors disabled:opacity-50"
          >
            {deleting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
            Delete user
          </button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
