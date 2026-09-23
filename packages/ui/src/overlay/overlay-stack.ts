'use client';

import { useCallback, useEffect, useId } from 'react';

/**
 * Tracks which overlays are open, in order. When a confirmation opens on top
 * of a drawer, Escape and Tab should only affect the confirmation.
 */
const stack: string[] = [];

export function useOverlayStack(active: boolean): () => boolean {
  const id = useId();

  useEffect(() => {
    if (!active) return;
    stack.push(id);
    return () => {
      const index = stack.lastIndexOf(id);
      if (index !== -1) stack.splice(index, 1);
    };
  }, [active, id]);

  // Stable across renders, so hooks that depend on it do not re-run.
  return useCallback(() => stack[stack.length - 1] === id, [id]);
}
