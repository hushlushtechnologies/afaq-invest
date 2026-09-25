'use client';

import { NAV_GROUPS, type NavGroup } from '@/config/navigation';
import { usePermissions } from '@/lib/auth/use-permissions';

export interface VisibleNav {
  groups: NavGroup[];
  /** True until the person's permissions are known. */
  loading: boolean;
}

/**
 * The sidebar, filtered to what this person can actually open.
 *
 * Hidden rather than disabled: a greyed-out "Finance" tells somebody the
 * module exists and taunts them with it, and there is nothing they can do
 * about it. The API refuses them regardless — this only decides what is
 * worth showing.
 *
 * A group whose items all disappear disappears with them; an "Operations"
 * heading with nothing under it looks like a bug.
 */
export function useVisibleNav(): VisibleNav {
  const { canAny, loading } = usePermissions();

  // Not memoised: canAny is a new closure on every render, so a memo would
  // recompute anyway — and filtering twelve items costs nothing.
  const groups = loading
    ? []
    : NAV_GROUPS.map((group) => ({
        ...group,
        items: group.items.filter(
          // No permissions listed means the module belongs to no resource —
          // the dashboard, personal settings, support — so everyone sees it.
          (module) => module.permissions === undefined || canAny([...module.permissions]),
        ),
      })).filter((group) => group.items.length > 0);

  return { groups, loading };
}
