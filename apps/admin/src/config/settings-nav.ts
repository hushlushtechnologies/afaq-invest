import { Bell, Building2, Settings2, ShieldCheck, UserRound, type LucideIcon } from 'lucide-react';
import type { PermissionKey } from '@afaq/types';

/**
 * Settings has its own navigation — a list beside the content on desktop,
 * a scrolling row of tabs on phones. Each section is a real address.
 */
export interface SettingsSection {
  key: 'profile' | 'security' | 'preferences' | 'notifications' | 'organisation';
  href: string;
  icon: LucideIcon;
  /**
   * What it takes to see the section — holding ANY one is enough.
   *
   * Most of Settings is personal (your own profile, password, preferences),
   * so it is ungated: everyone manages their own. Only the organisation's
   * settings answer to a permission.
   */
  permissions?: readonly PermissionKey[];
}

export const SETTINGS_SECTIONS: readonly SettingsSection[] = [
  { key: 'profile', href: '/settings/profile', icon: UserRound },
  { key: 'security', href: '/settings/security', icon: ShieldCheck },
  { key: 'preferences', href: '/settings/preferences', icon: Settings2 },
  { key: 'notifications', href: '/settings/notifications', icon: Bell },
  {
    key: 'organisation',
    href: '/settings/organisation',
    icon: Building2,
    permissions: ['settings.view'],
  },
];

export function findSettingsSection(pathname: string): SettingsSection | undefined {
  return SETTINGS_SECTIONS.find(
    (section) => pathname === section.href || pathname.startsWith(`${section.href}/`),
  );
}
