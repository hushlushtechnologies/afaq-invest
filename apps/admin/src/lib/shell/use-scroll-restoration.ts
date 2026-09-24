'use client';

import { useEffect, useRef, type RefObject } from 'react';

const STORAGE_KEY = 'afaq-scroll-positions';

function readPositions(): Record<string, number> {
  try {
    const raw = window.sessionStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as Record<string, number>) : {};
  } catch {
    return {};
  }
}

function writePosition(key: string, top: number): void {
  try {
    const positions = readPositions();
    positions[key] = top;
    window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(positions));
  } catch {
    // Storage is a convenience here; failing quietly is fine.
  }
}

/**
 * The page content scrolls inside its own container, not the window, so the
 * browser's own scroll restoration doesn't apply to it. Without this, opening
 * a new page keeps the previous page's scroll position, and going back loses
 * where you were.
 *
 * Forward navigation starts at the top; back and forward return to where you
 * were, remembered for this browser tab only.
 */
export function useScrollRestoration(
  containerRef: RefObject<HTMLElement | null>,
  routeKey: string,
): void {
  const wentBack = useRef(false);
  const previousKey = useRef(routeKey);
  // Where the page was last seen scrolled to. Read continuously while
  // scrolling, because by the time a navigation happens the old page has
  // already been removed and the container has snapped back to zero.
  const lastTop = useRef(0);

  // Follow the scroll position as it happens.
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    function handleScroll(): void {
      lastTop.current = container?.scrollTop ?? 0;
    }
    container.addEventListener('scroll', handleScroll, { passive: true });
    return () => container.removeEventListener('scroll', handleScroll);
  }, [containerRef]);

  // The browser fires popstate for back and forward; a link click does not.
  useEffect(() => {
    function handlePopState(): void {
      wentBack.current = true;
    }
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // Remember where the page we are leaving was scrolled to.
    if (previousKey.current !== routeKey) {
      writePosition(previousKey.current, lastTop.current);
      previousKey.current = routeKey;
    }

    const saved = wentBack.current ? readPositions()[routeKey] : undefined;
    wentBack.current = false;

    // 'instant' on purpose: a page arriving should already be in position,
    // not glide there while the reader watches. The page's content may still
    // be arriving, so the position is applied on the next frame as well.
    const top = saved ?? 0;
    lastTop.current = top;
    container.scrollTo({ top, behavior: 'instant' });
    const frame = window.requestAnimationFrame(() =>
      container.scrollTo({ top, behavior: 'instant' }),
    );
    return () => window.cancelAnimationFrame(frame);
  }, [containerRef, routeKey]);

  // Also remember the position when the tab is closed or reloaded.
  useEffect(() => {
    function handleUnload(): void {
      writePosition(routeKey, lastTop.current);
    }
    window.addEventListener('pagehide', handleUnload);
    return () => window.removeEventListener('pagehide', handleUnload);
  }, [containerRef, routeKey]);
}
