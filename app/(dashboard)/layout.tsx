import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import { Sidebar } from '@/components/layout/Sidebar';
import { TopBar } from '@/components/layout/TopBar';
import { SessionWrapper } from '@/components/layout/SessionWrapper';
import { Toaster } from '@/components/ui/sonner';

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // The session callback fails closed: deleted, suspended or
  // password-rotated users get a session WITHOUT a user id, so treat a
  // missing id as unauthenticated instead of rendering an empty shell.
  const session = await auth();
  if (!session?.user?.id) {
    redirect('/login');
  }

  // Users flagged with a temporary password must set their own before
  // using the dashboard.
  if (session.user.mustChangePassword) {
    redirect('/change-password');
  }

  return (
    <SessionWrapper session={session}>
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
