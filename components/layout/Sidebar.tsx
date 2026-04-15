'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard,
  Bot,
  Shield,
  Link as LinkIcon,
  Settings,
  MessageSquare,
  Zap,
} from 'lucide-react';

const navigation = [
  { name: 'Resumen', href: '/overview', icon: LayoutDashboard },
  { name: 'Cuentas', href: '/accounts', icon: LinkIcon },
  { name: 'Bots', href: '/bots', icon: Bot },
  { name: 'Comentarios', href: '/comments', icon: MessageSquare },
  { name: 'Configuración', href: '/settings', icon: Settings },
];

const bottomNavigation = [
  { name: 'Admin', href: '/admin', icon: Shield },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <div className="w-64 flex flex-col flex-shrink-0" style={{background: 'linear-gradient(180deg, #1e1b4b 0%, #312e81 50%, #1e1b4b 100%)'}}>
      {/* Logo */}
      <div className="h-16 flex items-center gap-3 px-5 border-b border-white/10">
        <div className="h-8 w-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{background: 'linear-gradient(135deg, #6366f1, #8b5cf6)'}}>
          <Zap className="h-4 w-4 text-white" />
        </div>
        <span className="text-white font-bold text-lg tracking-tight">SocialPulse</span>
      </div>

      {/* Main Nav */}
      <nav className="flex-1 px-3 py-5 space-y-0.5">
        {navigation.map((item) => {
          const isActive =
            pathname === item.href || pathname.startsWith(item.href + '/');

          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150',
                isActive
                  ? 'bg-white text-indigo-700 shadow-lg'
                  : 'text-indigo-200 hover:text-white hover:bg-white/10'
              )}
            >
              <item.icon className={cn('h-5 w-5 flex-shrink-0', isActive ? 'text-indigo-600' : '')} />
              {item.name}
              {isActive && (
                <span className="ml-auto h-1.5 w-1.5 rounded-full bg-indigo-500" />
              )}
            </Link>
          );
        })}
      </nav>

      {/* Bottom Nav */}
      <div className="px-3 py-4 border-t border-white/10 space-y-0.5">
        {bottomNavigation.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150',
                isActive
                  ? 'bg-white text-indigo-700 shadow-lg'
                  : 'text-indigo-200 hover:text-white hover:bg-white/10'
              )}
            >
              <item.icon className="h-5 w-5 flex-shrink-0" />
              {item.name}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
