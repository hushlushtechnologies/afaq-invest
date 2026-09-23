'use client';

import { useEffect, useRef } from 'react';

/** Calls onEscape when Escape is pressed, but only for the topmost overlay. */
export function useEscapeKey(
  active: boolean,
  onEscape: () => void,
  isTopmost: () => boolean = () => true,
): void {
  // Keep the latest callback without re-subscribing on every render.
  const callback = useRef(onEscape);
  callback.current = onEscape;
  const topmost = useRef(isTopmost);
  topmost.current = isTopmost;

  useEffect(() => {
    if (!active) return;

    function handleKeyDown(event: KeyboardEvent): void {
      if (event.key !== 'Escape' || !topmost.current()) return;
      event.preventDefault();
      callback.current();
    }

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [active]);
}
