import { Sidebar } from '@/components/layout/Sidebar';
import { TopBar } from '@/components/layout/TopBar';
import { SessionWrapper } from '@/components/layout/SessionWrapper';
import { Toaster } from '@/components/ui/sonner';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <SessionWrapper>
      <div className="flex h-screen overflow-hidden" style={{background: '#f1f5f9'}}>
        <Sidebar />
        <div className="flex-1 flex flex-col overflow-hidden min-w-0">
          <TopBar />
          <main className="flex-1 overflow-y-auto p-7">{children}</main>
        </div>
      </div>
      <Toaster richColors position="top-right" />
    </SessionWrapper>
  );
}
