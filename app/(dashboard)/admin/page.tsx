import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { redirect } from 'next/navigation';
import { PageHeader } from '@/components/layout/PageHeader';
import { TenantTable } from '@/components/admin/TenantTable';

export default async function AdminPage() {
  const session = await auth();
  if (!session?.user?.isSuperAdmin) redirect('/');

  const tenants = await prisma.tenant.findMany({
    include: {
      _count: {
        select: { users: true, bots: true },
      },
    },
    orderBy: { createdAt: 'asc' },
  });

  const serialized = tenants.map(t => ({
    ...t,
    createdAt: t.createdAt.toISOString(),
  }));

  const totalUsers = tenants.reduce((sum, t) => sum + t._count.users, 0);
  const totalBots = tenants.reduce((sum, t) => sum + t._count.bots, 0);

  return (
    <div>
      <PageHeader
        title="Admin Panel"
        description="Super-admin view of all tenants on the platform."
      />

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
          <p className="text-xs text-slate-500 font-medium uppercase tracking-wide mb-1">Tenants</p>
          <p className="text-2xl font-bold text-slate-900">{tenants.length}</p>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
          <p className="text-xs text-slate-500 font-medium uppercase tracking-wide mb-1">Total Users</p>
          <p className="text-2xl font-bold text-slate-900">{totalUsers}</p>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
          <p className="text-xs text-slate-500 font-medium uppercase tracking-wide mb-1">Total Bots</p>
          <p className="text-2xl font-bold text-slate-900">{totalBots}</p>
        </div>
      </div>

      <TenantTable tenants={serialized} />
    </div>
  );
}
