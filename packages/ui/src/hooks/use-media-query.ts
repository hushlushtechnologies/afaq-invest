'use client';

import { useCallback, useSyncExternalStore } from 'react';

/**
 * Follows a CSS media query from React, e.g. useMediaQuery('(min-width: 768px)').
 * The server can't measure a screen, so it answers false and the real value
 * applies as soon as the page runs in the browser.
 */
export function useMediaQuery(query: string): boolean {
  const subscribe = useCallback(
    (callback: () => void) => {
      const list = window.matchMedia(query);
      list.addEventListener('change', callback);
      return () => list.removeEventListener('change', callback);
    },
    [query],
  );

  return useSyncExternalStore(
    subscribe,
    () => window.matchMedia(query).matches,
    () => false,
  );
}
