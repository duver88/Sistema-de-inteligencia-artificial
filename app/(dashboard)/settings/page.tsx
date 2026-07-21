import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { Sparkles } from 'lucide-react';
import { PageHeader } from '@/components/layout/PageHeader';

export default async function SettingsPage() {
  const session = await auth();
  if (session?.user?.isSuperAdmin) redirect('/admin');
  if (!session?.user?.tenantId) return null;

  return (
    <div>
      <PageHeader
        title="Settings"
        description="Configure account integrations and preferences."
      />
      <div className="max-w-lg">
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div
            className="px-6 py-5 border-b border-slate-100"
            style={{ background: 'linear-gradient(135deg, #ecfeff 0%, #cffafe 100%)' }}
          >
            <div className="flex items-center gap-3">
              <div
                className="h-10 w-10 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{ background: 'linear-gradient(135deg, #00C4D4, #00E5FF)' }}
              >
                <Sparkles className="h-5 w-5" style={{ color: '#0a1628' }} />
              </div>
              <div>
                <h2 className="text-sm font-bold text-slate-900">AI Service</h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Powers comment classification and automatic replies.
                </p>
              </div>
            </div>
          </div>
          <div className="p-6">
            <p className="text-sm text-slate-600">
              The AI service is managed by your administrator. No configuration is
              required on your side — if AI features are not working, please contact
              your administrator.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
