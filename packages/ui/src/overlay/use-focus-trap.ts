'use client';

import { useEffect, useRef, type RefObject } from 'react';

const FOCUSABLE = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled]):not([type="hidden"])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(',');

function focusableIn(container: HTMLElement): HTMLElement[] {
  return Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
    (element) => element.getClientRects().length > 0,
  );
}

/**
 * While active: moves focus into the container, keeps Tab and Shift+Tab
 * cycling inside it, and on close returns focus to whatever had it before.
 * `isTopmost` stops an overlay underneath from fighting one on top.
 */
export function useFocusTrap(
  containerRef: RefObject<HTMLElement | null>,
  active: boolean,
  isTopmost: () => boolean = () => true,
): void {
  // Read through a ref so a new function each render never re-runs the effect
  // (re-running would pull focus back to the first field while someone types).
  const topmost = useRef(isTopmost);
  topmost.current = isTopmost;

  useEffect(() => {
    if (!active) return;

    const previouslyFocused = document.activeElement as HTMLElement | null;

    const frame = window.requestAnimationFrame(() => {
      const container = containerRef.current;
      if (!container) return;
      // Prefer an element marked data-autofocus, then the first focusable one.
      const preferred = container.querySelector<HTMLElement>('[data-autofocus]');
      (preferred ?? focusableIn(container)[0] ?? container).focus();
    });

    function handleKeyDown(event: KeyboardEvent): void {
      if (event.key !== 'Tab' || !topmost.current()) return;
      const container = containerRef.current;
      if (!container) return;

      const items = focusableIn(container);
      const first = items[0];
      const last = items[items.length - 1];
      if (!first || !last) {
        event.preventDefault();
        return;
      }

      const current = document.activeElement;
      if (event.shiftKey && (current === first || !container.contains(current))) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && (current === last || !container.contains(current))) {
        event.preventDefault();
        first.focus();
      }
    }

    document.addEventListener('keydown', handleKeyDown);

    return () => {
      window.cancelAnimationFrame(frame);
      document.removeEventListener('keydown', handleKeyDown);
      // Return focus to the button that opened the overlay.
      if (previouslyFocused && document.contains(previouslyFocused)) previouslyFocused.focus();
    };
  }, [active, containerRef]);
}
