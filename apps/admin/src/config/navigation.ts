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
import type { PermissionKey } from '@afaq/types';

/**
 * The Admin sidebar, in one place. Every module has:
 * - href    the address, without the language prefix (/en is added by Link)
 * - key     the translation key under `nav` in the message files
 * - icon    a Lucide icon
 * - permissions  what it takes to see it — holding ANY one is enough
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
  /**
   * Holding any one of these reveals the module.
   *
   * "Any" rather than "all" because a module is a doorway to several screens:
   * somebody who can see investment requests but not the rules still needs
   * the Investments entry. Omitted means everyone sees it — true only of the
   * dashboard, personal settings and support, which belong to no resource.
   */
  permissions?: readonly PermissionKey[];
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
    items: [
      {
        key: 'dashboard',
        href: '/dashboard',
        icon: LayoutDashboard,
        permissions: ['dashboard.view'],
      },
    ],
  },
  {
    key: 'investment',
    showTitle: true,
    items: [
      { key: 'investors', href: '/investors', icon: Users, permissions: ['investor.view'] },
      { key: 'companies', href: '/companies', icon: Building2, permissions: ['company.view'] },
      { key: 'partners', href: '/partners', icon: Handshake, permissions: ['partner.view'] },
      {
        key: 'investments',
        href: '/investments',
        icon: PieChart,
        permissions: ['opportunity.view', 'investment_rule.view', 'investment_request.view'],
      },
    ],
  },
  {
    key: 'operations',
    showTitle: true,
    items: [
      { key: 'finance', href: '/finance', icon: Banknote, permissions: ['finance.view'] },
      { key: 'compliance', href: '/compliance', icon: ShieldCheck, permissions: ['kyc.view'] },
      { key: 'documents', href: '/documents', icon: FileText, permissions: ['document.view'] },
      { key: 'reports', href: '/reports', icon: ScrollText, permissions: ['report.view'] },
    ],
  },
  {
    key: 'system',
    showTitle: true,
    items: [
      // Support belongs to no resource — anyone can reach help.
      { key: 'support', href: '/support', icon: LifeBuoy },
      {
        key: 'administration',
        href: '/administration',
        icon: UserCog,
        permissions: ['staff.view', 'role.view', 'audit.view'],
      },
      // Personal settings — everyone has their own to manage.
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
