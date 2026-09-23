'use client';

import { useSyncExternalStore } from 'react';

function subscribe(callback: () => void): () => void {
  // The language switcher changes <html dir>, so watch that attribute.
  const observer = new MutationObserver(callback);
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ['dir'] });
  return () => observer.disconnect();
}

/**
 * True when the page reads right to left (Arabic). Updates if the direction
 * changes. The server assumes left to right; the real value applies on the client.
 */
export function useIsRtl(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => document.documentElement.dir === 'rtl',
    () => false,
  );
}
