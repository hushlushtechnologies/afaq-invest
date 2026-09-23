'use client';

import { useEffect } from 'react';

let lockCount = 0;
let savedOverflow = '';
let savedPaddingRight = '';

/**
 * Stops the page behind an overlay from scrolling. Counted, so closing an
 * inner overlay does not unlock the page while an outer one is still open.
 */
export function useBodyScrollLock(active: boolean): void {
  useEffect(() => {
    if (!active) return;
    const body = document.body;

    if (lockCount === 0) {
      // Hiding the scrollbar would make the page jump sideways; pad to compensate.
      const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
      savedOverflow = body.style.overflow;
      savedPaddingRight = body.style.paddingRight;
      body.style.overflow = 'hidden';
      if (scrollbarWidth > 0) body.style.paddingRight = `${scrollbarWidth}px`;
    }
    lockCount += 1;

    return () => {
      lockCount -= 1;
      if (lockCount === 0) {
        body.style.overflow = savedOverflow;
        body.style.paddingRight = savedPaddingRight;
      }
    };
  }, [active]);
}
