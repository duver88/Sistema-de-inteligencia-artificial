'use client';

import { useState } from 'react';
import {
  LayoutDashboard,
  Sparkles,
  Users,
  Layers,
  MessageSquare,
  CreditCard,
  ScrollText,
} from 'lucide-react';
import { UserManagement } from './UserManagement';
import { AdminOverview } from './AdminOverview';
import { OpenAiKeyCard } from './OpenAiKeyCard';
import { UsagePanel } from './UsagePanel';
import { PagesAndBotsPanel } from './PagesAndBotsPanel';
import { ModerationPanel } from './ModerationPanel';
import { PlansPanel } from './PlansPanel';
import { AuditLogPanel } from './AuditLogPanel';

type AdminTab = 'overview' | 'users' | 'pages' | 'moderation' | 'plans' | 'audit' | 'ai';

const TABS: { id: AdminTab; label: string; icon: typeof Users }[] = [
  { id: 'overview', label: 'Overview', icon: LayoutDashboard },
  { id: 'users', label: 'Users', icon: Users },
  { id: 'pages', label: 'Pages & Bots', icon: Layers },
  { id: 'moderation', label: 'Moderation', icon: MessageSquare },
  { id: 'plans', label: 'Plans', icon: CreditCard },
  { id: 'audit', label: 'Audit log', icon: ScrollText },
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
      {tab === 'pages' && <PagesAndBotsPanel />}
      {tab === 'moderation' && <ModerationPanel />}
      {tab === 'plans' && <PlansPanel />}
      {tab === 'audit' && <AuditLogPanel />}
      {tab === 'ai' && (
        <div className="space-y-6">
          <OpenAiKeyCard />
          <UsagePanel />
        </div>
      )}
    </div>
  );
}
