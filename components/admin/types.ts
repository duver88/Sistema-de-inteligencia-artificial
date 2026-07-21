// Shared types for the admin user-management UI

export interface AdminUser {
  id: string;
  name: string | null;
  email: string | null;
  status: 'ACTIVE' | 'SUSPENDED';
  isSuperAdmin: boolean;
  mustChangePassword: boolean;
  lastLoginAt: string | null;
  createdAt: string;
  tenant: { id: string; name: string; plan: string } | null;
  stats: { accounts: number; bots: number; comments: number };
}
