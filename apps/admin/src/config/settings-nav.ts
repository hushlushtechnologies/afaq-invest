import { Bell, Building2, Settings2, ShieldCheck, UserRound, type LucideIcon } from 'lucide-react';

/**
 * Settings has its own navigation — a list beside the content on desktop,
 * a scrolling row of tabs on phones. Each section is a real address.
 */
export interface SettingsSection {
  key: 'profile' | 'security' | 'preferences' | 'notifications' | 'organisation';
  href: string;
  icon: LucideIcon;
  /** Sections only administrators should see. Sprint 3 enforces this. */
  adminOnly?: boolean;
}

export const SETTINGS_SECTIONS: readonly SettingsSection[] = [
  { key: 'profile', href: '/settings/profile', icon: UserRound },
  { key: 'security', href: '/settings/security', icon: ShieldCheck },
  { key: 'preferences', href: '/settings/preferences', icon: Settings2 },
  { key: 'notifications', href: '/settings/notifications', icon: Bell },
  { key: 'organisation', href: '/settings/organisation', icon: Building2, adminOnly: true },
];

export function findSettingsSection(pathname: string): SettingsSection | undefined {
  return SETTINGS_SECTIONS.find(
    (section) => pathname === section.href || pathname.startsWith(`${section.href}/`),
  );
}
