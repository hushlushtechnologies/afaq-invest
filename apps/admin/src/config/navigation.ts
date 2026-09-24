import {
  Banknote,
  Building2,
  FileText,
  Handshake,
  LayoutDashboard,
  LifeBuoy,
  PieChart,
  ScrollText,
  Settings,
  ShieldCheck,
  Users,
  UserCog,
  type LucideIcon,
} from 'lucide-react';

/**
 * The Admin sidebar, in one place. Every module has:
 * - href    the address, without the language prefix (/en is added by Link)
 * - key     the translation key under `nav` in the message files
 * - icon    a Lucide icon
 *
 * Groups keep twelve modules readable; their titles come from `navGroups`.
 */
export interface NavModule {
  key:
    | 'dashboard'
    | 'investors'
    | 'companies'
    | 'partners'
    | 'investments'
    | 'finance'
    | 'compliance'
    | 'documents'
    | 'reports'
    | 'support'
    | 'administration'
    | 'settings';
  href: string;
  icon: LucideIcon;
}

export interface NavGroup {
  /** Translation key under `navGroups`. The first group has no heading. */
  key: 'overview' | 'investment' | 'operations' | 'system';
  showTitle: boolean;
  items: readonly NavModule[];
}

export const NAV_GROUPS: readonly NavGroup[] = [
  {
    key: 'overview',
    showTitle: false,
    items: [{ key: 'dashboard', href: '/dashboard', icon: LayoutDashboard }],
  },
  {
    key: 'investment',
    showTitle: true,
    items: [
      { key: 'investors', href: '/investors', icon: Users },
      { key: 'companies', href: '/companies', icon: Building2 },
      { key: 'partners', href: '/partners', icon: Handshake },
      { key: 'investments', href: '/investments', icon: PieChart },
    ],
  },
  {
    key: 'operations',
    showTitle: true,
    items: [
      { key: 'finance', href: '/finance', icon: Banknote },
      { key: 'compliance', href: '/compliance', icon: ShieldCheck },
      { key: 'documents', href: '/documents', icon: FileText },
      { key: 'reports', href: '/reports', icon: ScrollText },
    ],
  },
  {
    key: 'system',
    showTitle: true,
    items: [
      { key: 'support', href: '/support', icon: LifeBuoy },
      { key: 'administration', href: '/administration', icon: UserCog },
      { key: 'settings', href: '/settings', icon: Settings },
    ],
  },
];

export const NAV_MODULES: readonly NavModule[] = NAV_GROUPS.flatMap((group) => group.items);

/**
 * Which module a page belongs to. /investors/42/documents is still Investors,
 * so the sidebar keeps the right item highlighted on detail pages.
 */
export function findActiveModule(pathname: string): NavModule | undefined {
  return NAV_MODULES.find(
    (module) => pathname === module.href || pathname.startsWith(`${module.href}/`),
  );
}
