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
  // ISO string of the end of the day (UTC) the account expires, or null
  // for unlimited access. Ignored for super admins — they never expire.
  accessExpiresAt: string | null;
  tenant: { id: string; name: string; plan: string } | null;
  stats: { accounts: number; bots: number; comments: number };
}

// Rich payload returned by GET /api/admin/users/[userId] for the
// read-only "View details" dialog. Kept separate from AdminUser so the
// list endpoint stays lean.
export interface AdminUserDetailsAccount {
  id: string;
  platform: 'FACEBOOK' | 'INSTAGRAM';
  pageName: string;
  pictureUrl: string | null;
  isActive: boolean;
  webhookSubscribed: boolean;
  connectedAt: string;
}

export interface AdminUserDetailsBot {
  id: string;
  name: string;
  isActive: boolean;
  aiModel: string;
  pageName: string;
  commentCount: number;
}

export interface AdminUserDetails {
  user: {
    id: string;
    name: string | null;
    email: string | null;
    status: 'ACTIVE' | 'SUSPENDED';
    isSuperAdmin: boolean;
    mustChangePassword: boolean;
    lastLoginAt: string | null;
    createdAt: string;
    accessExpiresAt: string | null;
  };
  tenant: {
    id: string;
    name: string;
    plan: string;
    openaiKeySet: boolean;
    openaiKeySetAt: string | null;
  } | null;
  accounts: AdminUserDetailsAccount[];
  bots: AdminUserDetailsBot[];
}
