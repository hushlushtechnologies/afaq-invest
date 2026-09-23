'use client';

import { useEffect, useRef, type RefObject } from 'react';

/**
 * Calls onOutside when the pointer is pressed outside every given element.
 * Uses pointerdown, so a menu closes before the click lands on whatever is below.
 */
export function useClickOutside(
  refs: ReadonlyArray<RefObject<HTMLElement | null>>,
  active: boolean,
  onOutside: () => void,
): void {
  const callback = useRef(onOutside);
  callback.current = onOutside;
  const targets = useRef(refs);
  targets.current = refs;

  useEffect(() => {
    if (!active) return;

    function handlePointerDown(event: PointerEvent): void {
      const target = event.target as Node | null;
      if (!target) return;
      const inside = targets.current.some((ref) => ref.current?.contains(target));
      if (!inside) callback.current();
    }

    document.addEventListener('pointerdown', handlePointerDown, true);
    return () => document.removeEventListener('pointerdown', handlePointerDown, true);
  }, [active]);
}
