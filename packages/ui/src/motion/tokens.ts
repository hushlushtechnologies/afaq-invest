/**
 * Motion timing, in seconds for Framer Motion. Mirrors the CSS values in
 * typography.css (--afaq-duration-*, --ease-*), so CSS and JS animations
 * share one rhythm.
 */
export const DURATION = {
  instant: 0.01,
  fast: 0.15,
  normal: 0.22,
  slow: 0.32,
} as const;

export const EASE = {
  /** Decelerates into place — the default for things arriving. */
  out: [0.22, 1, 0.36, 1],
  /** Symmetric — for things moving from one place to another. */
  inOut: [0.65, 0, 0.35, 1],
} as const;

/** A gentle spring with a small settle, for confirmations. */
export const SPRING = { type: 'spring', stiffness: 380, damping: 22 } as const;

/** Stagger gap between list items, in seconds. */
export const STAGGER = 0.05;
