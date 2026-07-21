'use client';

import { useCallback, useEffect, useState } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { enUS } from 'date-fns/locale';
import {
  Ban,
  CheckCircle2,
  Eye,
  KeyRound,
  Loader2,
  Pencil,
  RefreshCw,
  ShieldCheck,
  Trash2,
  UserPlus,
  Users,
} from 'lucide-react';
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
import { CreateUserDialog } from './CreateUserDialog';
import { EditUserDialog } from './EditUserDialog';
import { ResetPasswordDialog } from './ResetPasswordDialog';
import { DeleteUserDialog } from './DeleteUserDialog';
import { UserDetailsDialog } from './UserDetailsDialog';
import type { AdminUser } from './types';

const PLAN_CONFIG: Record<string, { label: string; className: string }> = {
  FREE:         { label: 'Free',         className: 'bg-slate-100 text-slate-600' },
  STARTER:      { label: 'Starter',      className: 'bg-blue-50 text-blue-700' },
  PROFESSIONAL: { label: 'Professional', className: 'bg-cyan-50 text-cyan-700' },
  ENTERPRISE:   { label: 'Enterprise',   className: 'bg-purple-50 text-purple-700' },
};

interface UserManagementProps {
  currentUserId: string;
}

export function UserManagement({ currentUserId }: UserManagementProps) {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  const [createOpen, setCreateOpen] = useState(false);
  const [detailsUser, setDetailsUser] = useState<AdminUser | null>(null);
  const [editUser, setEditUser] = useState<AdminUser | null>(null);
  const [resetUser, setResetUser] = useState<AdminUser | null>(null);
  const [deleteUser, setDeleteUser] = useState<AdminUser | null>(null);
  // Suspending is destructive (cuts the user's access on their next
  // request), so it requires a confirmation dialog. Reactivation stays
  // one-click.
  const [suspendUser, setSuspendUser] = useState<AdminUser | null>(null);

  const fetchUsers = useCallback(async () => {
    setError(null);
    try {
      const res = await fetch('/api/admin/users', { cache: 'no-store' });
      if (!res.ok) throw new Error();
      const data = await res.json();
      setUsers(data.users ?? []);
    } catch {
      setError('Failed to load users. Please try again.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchUsers();
  }, [fetchUsers]);

  function replaceUser(updated: AdminUser) {
    setUsers((prev) => prev.map((u) => (u.id === updated.id ? { ...u, ...updated } : u)));
  }

  async function handleToggleStatus(user: AdminUser) {
    const newStatus = user.status === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE';
    setTogglingId(user.id);
    try {
      const res = await fetch(`/api/admin/users/${user.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(data.error ?? 'Failed to update user status');
        return;
      }
      replaceUser({ ...user, ...data.user });
      toast.success(newStatus === 'SUSPENDED' ? 'User suspended' : 'User reactivated');
    } catch {
      toast.error('Failed to update user status');
    } finally {
      setTogglingId(null);
    }
  }

  const activeCount = users.filter((u) => u.status === 'ACTIVE').length;
  const suspendedCount = users.length - activeCount;

  const toolbar = (
    <div className="flex items-center justify-between mb-4">
      <button
        type="button"
        onClick={() => void fetchUsers()}
        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
      >
        <RefreshCw className="h-3.5 w-3.5" />
        Refresh
      </button>
      <button
        type="button"
        onClick={() => setCreateOpen(true)}
        className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-bold rounded-xl transition-all"
        style={{ background: 'linear-gradient(135deg, #00C4D4, #00E5FF)', color: '#0a1628' }}
      >
        <UserPlus className="h-4 w-4" />
        Create user
      </button>
    </div>
  );

  const dialogs = (
    <>
      <CreateUserDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        onCreated={(user) => setUsers((prev) => [...prev, user])}
      />
      <UserDetailsDialog
        user={detailsUser}
        onOpenChange={(open) => { if (!open) setDetailsUser(null); }}
      />
      <EditUserDialog
        user={editUser}
        onOpenChange={(open) => { if (!open) setEditUser(null); }}
        onUpdated={replaceUser}
      />
      <ResetPasswordDialog
        user={resetUser}
        onOpenChange={(open) => { if (!open) setResetUser(null); }}
        onReset={replaceUser}
      />
      <DeleteUserDialog
        user={deleteUser}
        onOpenChange={(open) => { if (!open) setDeleteUser(null); }}
        onDeleted={(userId) => setUsers((prev) => prev.filter((u) => u.id !== userId))}
      />
      <AlertDialog
        open={!!suspendUser}
        onOpenChange={(open) => { if (!open) setSuspendUser(null); }}
      >
        <AlertDialogContent className="bg-white">
          <AlertDialogHeader>
            <AlertDialogTitle>
              Suspend {suspendUser?.name ?? suspendUser?.email ?? 'user'}?
            </AlertDialogTitle>
            <AlertDialogDescription>
              A suspended user immediately loses access to the dashboard and
              the API on their next request. You can reactivate them at any
              time.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <button
              type="button"
              onClick={() => {
                const user = suspendUser;
                setSuspendUser(null);
                if (user) void handleToggleStatus(user);
              }}
              className="inline-flex items-center justify-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-amber-600 hover:bg-amber-700 rounded-lg transition-colors"
            >
              Suspend user
            </button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 bg-white border border-slate-200 rounded-2xl shadow-sm">
        <Loader2 className="h-6 w-6 text-slate-400 animate-spin mb-3" />
        <p className="text-sm text-slate-500">Loading users…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-24 bg-white border border-slate-200 rounded-2xl shadow-sm">
        <p className="text-sm font-semibold text-slate-900 mb-1">Something went wrong</p>
        <p className="text-xs text-slate-500 mb-4">{error}</p>
        <button
          type="button"
          onClick={() => { setLoading(true); void fetchUsers(); }}
          className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-slate-600 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          Retry
        </button>
      </div>
    );
  }

  return (
    <div>
      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
          <p className="text-xs text-slate-500 font-medium uppercase tracking-wide mb-2">Users</p>
          <p className="text-3xl font-bold text-slate-900">{users.length}</p>
        </div>
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
          <p className="text-xs text-slate-500 font-medium uppercase tracking-wide mb-2">Active</p>
          <p className="text-3xl font-bold text-slate-900">{activeCount}</p>
        </div>
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
          <p className="text-xs text-slate-500 font-medium uppercase tracking-wide mb-2">Suspended</p>
          <p className="text-3xl font-bold text-slate-900">{suspendedCount}</p>
        </div>
      </div>

      {toolbar}

      {users.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 bg-white border border-slate-200 rounded-2xl shadow-sm">
          <div className="h-14 w-14 bg-slate-100 rounded-2xl flex items-center justify-center mb-4">
            <Users className="h-7 w-7 text-slate-400" />
          </div>
          <p className="text-sm font-semibold text-slate-900 mb-1">No users yet</p>
          <p className="text-xs text-slate-500">Create the first user to get started.</p>
        </div>
      ) : (
        <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50">
                  <th className="text-left px-5 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wide">User</th>
                  <th className="text-left px-5 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wide">Status</th>
                  <th className="text-left px-5 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wide">Tenant</th>
                  <th className="text-center px-3 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wide">Pages</th>
                  <th className="text-center px-3 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wide">Bots</th>
                  <th className="text-center px-3 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wide">Comments</th>
                  <th className="text-left px-5 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wide">Last login</th>
                  <th className="text-right px-5 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wide">Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => {
                  const isSelf = user.id === currentUserId;
                  const plan = user.tenant ? (PLAN_CONFIG[user.tenant.plan] ?? PLAN_CONFIG.FREE) : null;
                  const suspended = user.status === 'SUSPENDED';
                  return (
                    <tr key={user.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50/80 transition-colors">
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-3">
                          <div className="h-9 w-9 rounded-full bg-gradient-to-br from-cyan-100 to-cyan-200 flex items-center justify-center flex-shrink-0 text-xs font-semibold text-cyan-700">
                            {(user.name ?? user.email ?? '?')[0].toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5">
                              <p className="text-sm font-medium text-slate-900 truncate">
                                {user.name ?? '—'}
                              </p>
                              {user.isSuperAdmin && (
                                <span
                                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-purple-50 text-purple-700 border border-purple-200"
                                  title="Super admin"
                                >
                                  <ShieldCheck className="h-3 w-3" />
                                  Admin
                                </span>
                              )}
                              {isSelf && (
                                <span className="text-[10px] text-slate-400 font-medium">(you)</span>
                              )}
                            </div>
                            <p className="text-xs text-slate-400 truncate">{user.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-3.5">
                        <div className="flex flex-col items-start gap-1">
                          {suspended ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-red-50 text-red-700 border border-red-200">
                              <Ban className="h-3 w-3" />
                              Suspended
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                              <CheckCircle2 className="h-3 w-3" />
                              Active
                            </span>
                          )}
                          {user.mustChangePassword && (
                            <span className="text-[10px] text-amber-600">Must change password</span>
                          )}
                        </div>
                      </td>
                      <td className="px-5 py-3.5">
                        {user.tenant ? (
                          <div>
                            <p className="text-sm text-slate-700 truncate max-w-[140px]">{user.tenant.name}</p>
                            {plan && (
                              <span className={`inline-block mt-0.5 px-2 py-0.5 rounded-full text-[10px] font-medium ${plan.className}`}>
                                {plan.label}
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="text-xs text-slate-400">No tenant</span>
                        )}
                      </td>
                      <td className="px-3 py-3.5 text-center text-slate-600">{user.stats.accounts}</td>
                      <td className="px-3 py-3.5 text-center text-slate-600">{user.stats.bots}</td>
                      <td className="px-3 py-3.5 text-center text-slate-600">{user.stats.comments}</td>
                      <td className="px-5 py-3.5 text-xs text-slate-500 whitespace-nowrap">
                        {user.lastLoginAt
                          ? formatDistanceToNow(new Date(user.lastLoginAt), { addSuffix: true, locale: enUS })
                          : 'Never'}
                      </td>
                      <td className="px-5 py-3.5">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            type="button"
                            onClick={() => setDetailsUser(user)}
                            className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-colors"
                            title="View details"
                          >
                            <Eye className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setEditUser(user)}
                            className="p-1.5 text-slate-400 hover:text-cyan-600 hover:bg-cyan-50 rounded-xl transition-colors"
                            title="Edit name and email"
                          >
                            <Pencil className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              suspended
                                ? void handleToggleStatus(user)
                                : setSuspendUser(user)
                            }
                            disabled={isSelf || togglingId === user.id}
                            className={`p-1.5 rounded-xl transition-colors disabled:opacity-30 ${
                              suspended
                                ? 'text-slate-400 hover:text-emerald-600 hover:bg-emerald-50'
                                : 'text-slate-400 hover:text-amber-600 hover:bg-amber-50'
                            }`}
                            title={isSelf ? 'You cannot suspend yourself' : suspended ? 'Reactivate user' : 'Suspend user'}
                          >
                            {togglingId === user.id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : suspended ? (
                              <CheckCircle2 className="h-4 w-4" />
                            ) : (
                              <Ban className="h-4 w-4" />
                            )}
                          </button>
                          <button
                            type="button"
                            onClick={() => setResetUser(user)}
                            className="p-1.5 text-slate-400 hover:text-purple-600 hover:bg-purple-50 rounded-xl transition-colors"
                            title="Reset password"
                          >
                            <KeyRound className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setDeleteUser(user)}
                            disabled={isSelf || user.isSuperAdmin}
                            className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-colors disabled:opacity-30"
                            title={
                              isSelf
                                ? 'You cannot delete your own account'
                                : user.isSuperAdmin
                                  ? 'Super admin accounts cannot be deleted'
                                  : 'Delete user'
                            }
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {dialogs}
    </div>
  );
}
