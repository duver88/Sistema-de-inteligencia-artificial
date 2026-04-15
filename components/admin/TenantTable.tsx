import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';

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
  FREE:         { label: 'Gratis',        className: 'bg-slate-100 text-slate-600' },
  STARTER:      { label: 'Inicial',       className: 'bg-blue-50 text-blue-700' },
  PROFESSIONAL: { label: 'Profesional',   className: 'bg-cyan-50 text-cyan-700' },
  ENTERPRISE:   { label: 'Empresarial',   className: 'bg-purple-50 text-purple-700' },
};

export function TenantTable({ tenants }: TenantTableProps) {
  if (tenants.length === 0) {
    return (
      <p className="text-center py-12 text-sm text-slate-500">No se encontraron tenants.</p>
    );
  }

  return (
    <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-slate-200 bg-slate-50">
            <th className="text-left px-5 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wide">Tenant</th>
            <th className="text-left px-5 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wide">Plan</th>
            <th className="text-left px-5 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wide">Usuarios</th>
            <th className="text-left px-5 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wide">Bots</th>
            <th className="text-left px-5 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wide">Registrado</th>
          </tr>
        </thead>
        <tbody>
          {tenants.map((tenant, i) => {
            const plan = PLAN_CONFIG[tenant.plan] ?? PLAN_CONFIG.FREE;
            const timeAgo = formatDistanceToNow(new Date(tenant.createdAt), { addSuffix: true, locale: es });
            return (
              <tr
                key={tenant.id}
                className={`border-b border-slate-100 last:border-0 ${i % 2 === 0 ? '' : 'bg-slate-50/50'}`}
              >
                <td className="px-5 py-3.5">
                  <p className="font-medium text-slate-900">{tenant.name}</p>
                  <p className="text-xs text-slate-400 font-mono">{tenant.id}</p>
                </td>
                <td className="px-5 py-3.5">
                  <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${plan.className}`}>
                    {plan.label}
                  </span>
                </td>
                <td className="px-5 py-3.5 text-slate-600">{tenant._count.users}</td>
                <td className="px-5 py-3.5 text-slate-600">{tenant._count.bots}</td>
                <td className="px-5 py-3.5 text-xs text-slate-500">{timeAgo}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
