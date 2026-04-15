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
} from 'lucide-react';
import { LionsCoreIcon } from '@/components/icons/LionsCoreIcon';

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
    <div className="w-64 flex flex-col flex-shrink-0" style={{ background: '#021130' }}>
      {/* Logo */}
      <div className="h-16 flex items-center gap-2.5 px-5 border-b border-white/10">
        <LionsCoreIcon size={32} />
        <div className="flex items-baseline gap-0.5">
          <span className="text-white font-bold text-xl tracking-tight">Lionscore</span>
          <span className="text-sm font-semibold" style={{ color: '#12fdee' }}>ai</span>
        </div>
      </div>

      {/* Main Nav */}
      <nav className="flex-1 py-5 space-y-0.5">
        {navigation.map((item) => {
          const isActive =
            pathname === item.href || pathname.startsWith(item.href + '/');

          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                'flex items-center gap-3 mx-2 py-2.5 px-3 rounded-xl text-sm font-medium transition-all duration-150',
                isActive
                  ? 'font-semibold'
                  : 'text-slate-400 hover:bg-white/5 hover:text-white'
              )}
              style={isActive ? { background: 'linear-gradient(135deg, #0bbfb8, #12fdee)', color: '#021130' } : undefined}
            >
              <item.icon className="h-5 w-5 flex-shrink-0" />
              {item.name}
            </Link>
          );
        })}
      </nav>

      {/* Bottom Nav */}
      <div className="py-4 border-t border-white/10 space-y-0.5">
        {bottomNavigation.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                'flex items-center gap-3 mx-2 py-2.5 px-3 rounded-xl text-sm font-medium transition-all duration-150',
                isActive
                  ? 'font-semibold'
                  : 'text-slate-400 hover:bg-white/5 hover:text-white'
              )}
              style={isActive ? { background: 'linear-gradient(135deg, #0bbfb8, #12fdee)', color: '#021130' } : undefined}
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
