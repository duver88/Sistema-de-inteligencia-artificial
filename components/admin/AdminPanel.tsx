'use client';

import { useState } from 'react';
import { LayoutDashboard, Sparkles, Users } from 'lucide-react';
import { UserManagement } from './UserManagement';
import { AdminOverview } from './AdminOverview';
import { OpenAiKeyCard } from './OpenAiKeyCard';
import { UsagePanel } from './UsagePanel';

type AdminTab = 'overview' | 'users' | 'ai';

const TABS: { id: AdminTab; label: string; icon: typeof Users }[] = [
  { id: 'overview', label: 'Overview', icon: LayoutDashboard },
  { id: 'users', label: 'Users', icon: Users },
  { id: 'ai', label: 'AI & Usage', icon: Sparkles },
];

interface AdminPanelProps {
  currentUserId: string;
}

export function AdminPanel({ currentUserId }: AdminPanelProps) {
  const [tab, setTab] = useState<AdminTab>('overview');

  return (
    <div>
      <div className="inline-flex items-center gap-1 p-1 bg-white border border-slate-200 rounded-xl shadow-sm mb-6">
        {TABS.map(({ id, label, icon: Icon }) => {
          const active = tab === id;
          return (
            <button
              key={id}
              type="button"
              onClick={() => setTab(id)}
              className={`inline-flex items-center gap-1.5 px-4 py-2 text-sm rounded-lg transition-all ${
                active
                  ? 'font-bold shadow-sm'
                  : 'font-medium text-slate-500 hover:text-slate-700 hover:bg-slate-50'
              }`}
              style={
                active
                  ? { background: 'linear-gradient(135deg, #00C4D4, #00E5FF)', color: '#0a1628' }
                  : undefined
              }
            >
              <Icon className="h-4 w-4" />
              {label}
            </button>
          );
        })}
      </div>

      {tab === 'overview' && <AdminOverview />}
      {tab === 'users' && <UserManagement currentUserId={currentUserId} />}
      {tab === 'ai' && (
        <div className="space-y-6">
          <OpenAiKeyCard />
          <UsagePanel />
        </div>
      )}
    </div>
  );
}
