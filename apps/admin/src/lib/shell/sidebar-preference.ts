/**
 * The expanded/collapsed choice lives in a cookie rather than browser storage,
 * because the server can read a cookie while rendering. The sidebar therefore
 * arrives in the right state in the very first HTML — no flash of the wrong
 * width, and no content jumping once the page comes alive.
 */
export const SIDEBAR_COOKIE = 'AFAQ_SIDEBAR';

export type SidebarState = 'expanded' | 'collapsed';

export function isCollapsed(value: string | undefined): boolean {
  return value === 'collapsed';
}

/** Writes the choice for a year. Runs in the browser only. */
export function storeSidebarPreference(collapsed: boolean): void {
  const state: SidebarState = collapsed ? 'collapsed' : 'expanded';
  document.cookie = `${SIDEBAR_COOKIE}=${state}; path=/; max-age=${60 * 60 * 24 * 365}; samesite=lax`;
}
