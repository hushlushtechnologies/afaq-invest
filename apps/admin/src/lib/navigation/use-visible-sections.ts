'use client';

import { sectionsFor, type ModuleSection } from '@/config/module-tabs';
import type { NavModule } from '@/config/navigation';
import { SETTINGS_SECTIONS, type SettingsSection } from '@/config/settings-nav';
import { usePermissions } from '@/lib/auth/use-permissions';

interface Visible<T> {
  sections: T[];
  loading: boolean;
}

/**
 * The tabs inside a module, filtered to what this person can open.
 *
 * Same reasoning as the sidebar: a tab they cannot use is a dead end, and the
 * API refuses them anyway. An auditor in Administration sees the audit trail
 * and nothing else.
 */
export function useVisibleSections(module: NavModule['key']): Visible<ModuleSection> {
  const { canAny, loading } = usePermissions();

  const sections = loading
    ? []
    : sectionsFor(module).filter(
        (section) => section.permissions === undefined || canAny([...section.permissions]),
      );

  return { sections, loading };
}

/** The same, for the sections down the side of Settings. */
export function useVisibleSettingsSections(): Visible<SettingsSection> {
  const { canAny, loading } = usePermissions();

  const sections = loading
    ? []
    : SETTINGS_SECTIONS.filter(
        (section) => section.permissions === undefined || canAny([...section.permissions]),
      );

  return { sections, loading };
}
