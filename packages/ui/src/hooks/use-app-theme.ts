'use client';

import { useTheme } from 'next-themes';

import { useMounted } from './use-mounted';

export type AppTheme = 'light' | 'dark' | 'system';
export type ResolvedAppTheme = 'light' | 'dark';

export function useAppTheme() {
  const { theme, setTheme: setNextTheme, resolvedTheme, systemTheme, themes } = useTheme();

  const mounted = useMounted();

  const currentTheme: AppTheme =
    theme === 'light' || theme === 'dark' || theme === 'system' ? theme : 'system';

  const resolved: ResolvedAppTheme = resolvedTheme === 'dark' ? 'dark' : 'light';

  function setTheme(nextTheme: AppTheme) {
    setNextTheme(nextTheme);
  }

  function toggle() {
    setNextTheme(resolved === 'dark' ? 'light' : 'dark');
  }

  return {
    mounted,

    theme: currentTheme,

    // Both names are intentionally exposed.
    resolved,
    resolvedTheme: resolved,

    systemTheme,
    themes,

    setTheme,
    toggle,

    isDark: mounted && resolved === 'dark',
    isLight: mounted && resolved === 'light',
  };
}
