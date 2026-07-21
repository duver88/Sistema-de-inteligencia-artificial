import {
  LayoutDashboard,
  Users,
  Layers,
  MessageSquare,
  CreditCard,
  ScrollText,
  Sparkles,
} from 'lucide-react';

/**
 * The admin panel sections. Rendered as sidebar links (under "Administration")
 * and backed by a real route each, so URLs are clean and the sidebar can
 * highlight the active section by pathname.
 */
export const ADMIN_SECTIONS = [
  { label: 'Overview', href: '/admin', icon: LayoutDashboard },
  { label: 'Users', href: '/admin/users', icon: Users },
  { label: 'Pages & Bots', href: '/admin/pages', icon: Layers },
  { label: 'Moderation', href: '/admin/moderation', icon: MessageSquare },
  { label: 'Plans', href: '/admin/plans', icon: CreditCard },
  { label: 'Audit log', href: '/admin/audit', icon: ScrollText },
  { label: 'AI & Usage', href: '/admin/ai', icon: Sparkles },
] as const;
