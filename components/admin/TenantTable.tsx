import { formatDistanceToNow } from 'date-fns';

interface Tenant {
  id: string;
  name: string;
  plan: string;
  createdAt: Date | string;
  _count: {
    users: number;
    bots: number;
  };
}

interface TenantTableProps {
  tenants: Tenant[];
}

const PLAN_CONFIG: Record<string, { label: string; className: string }> = {
  FREE:         { label: 'Free',         className: 'bg-slate-100 text-slate-600' },
  STARTER:      { label: 'Starter',      className: 'bg-blue-50 text-blue-700' },
  PROFESSIONAL: { label: 'Professional', className: 'bg-indigo-50 text-indigo-700' },
  ENTERPRISE:   { label: 'Enterprise',   className: 'bg-purple-50 text-purple-700' },
};

export function TenantTable({ tenants }: TenantTableProps) {
  if (tenants.length === 0) {
    return (
      <p className="text-center py-12 text-sm text-slate-500">No tenants found.</p>
    );
  }

  return (
    <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-slate-200 bg-slate-50">
            <th className="text-left px-4 py-3 text-xs font-semibold text-slate-600 uppercase tracking-wide">Tenant</th>
            <th className="text-left px-4 py-3 text-xs font-semibold text-slate-600 uppercase tracking-wide">Plan</th>
            <th className="text-left px-4 py-3 text-xs font-semibold text-slate-600 uppercase tracking-wide">Users</th>
            <th className="text-left px-4 py-3 text-xs font-semibold text-slate-600 uppercase tracking-wide">Bots</th>
            <th className="text-left px-4 py-3 text-xs font-semibold text-slate-600 uppercase tracking-wide">Joined</th>
          </tr>
        </thead>
        <tbody>
          {tenants.map((tenant, i) => {
            const plan = PLAN_CONFIG[tenant.plan] ?? PLAN_CONFIG.FREE;
            const timeAgo = formatDistanceToNow(new Date(tenant.createdAt), { addSuffix: true });
            return (
              <tr
                key={tenant.id}
                className={`border-b border-slate-100 last:border-0 ${i % 2 === 0 ? '' : 'bg-slate-50/50'}`}
              >
                <td className="px-4 py-3">
                  <p className="font-medium text-slate-900">{tenant.name}</p>
                  <p className="text-xs text-slate-400 font-mono">{tenant.id}</p>
                </td>
                <td className="px-4 py-3">
                  <span className={`px-2 py-0.5 rounded-md text-xs font-medium ${plan.className}`}>
                    {plan.label}
                  </span>
                </td>
                <td className="px-4 py-3 text-slate-600">{tenant._count.users}</td>
                <td className="px-4 py-3 text-slate-600">{tenant._count.bots}</td>
                <td className="px-4 py-3 text-xs text-slate-500">{timeAgo}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
