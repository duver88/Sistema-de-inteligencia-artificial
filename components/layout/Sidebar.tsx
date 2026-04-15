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
    <div className="w-64 flex flex-col flex-shrink-0" style={{ background: 'linear-gradient(180deg, #0a1628 0%, #0d2038 100%)' }}>
      {/* Logo */}
      <div className="h-16 flex items-center gap-3 px-5 border-b border-white/10">
        <div
          className="h-8 w-8 rounded-lg flex items-center justify-center flex-shrink-0"
          style={{ background: 'linear-gradient(135deg, #00C4D4, #00E5FF)' }}
        >
          <LionsCoreIcon size={16} />
        </div>
        <span className="text-white font-bold text-xl tracking-tight">LionsCore</span>
        <span className="text-xs font-semibold ml-[-6px]" style={{ color: '#00E5FF' }}>ai</span>
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
                  ? 'text-white'
                  : 'text-slate-400 hover:bg-white/5 hover:text-white'
              )}
              style={isActive ? { background: 'linear-gradient(135deg, #00C4D4, #00E5FF)', color: '#0a1628' } : undefined}
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
                  ? 'text-white'
                  : 'text-slate-400 hover:bg-white/5 hover:text-white'
              )}
              style={isActive ? { background: 'linear-gradient(135deg, #00C4D4, #00E5FF)', color: '#0a1628' } : undefined}
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
