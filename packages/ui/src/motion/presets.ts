import type { Transition, Variants } from 'framer-motion';
import { DURATION, EASE, SPRING, STAGGER } from './tokens';

/**
 * Every preset uses the same three states:
 *   hidden  → where it starts
 *   visible → where it rests
 *   exit    → where it goes when removed
 * so any preset can replace any other without changing the component.
 */

const arrive: Transition = { duration: DURATION.normal, ease: EASE.out };
const leave: Transition = { duration: DURATION.fast, ease: EASE.out };

export const fade: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: arrive },
  exit: { opacity: 0, transition: leave },
};

export const fadeUp: Variants = {
  hidden: { opacity: 0, y: 12 },
  visible: { opacity: 1, y: 0, transition: arrive },
  exit: { opacity: 0, y: 8, transition: leave },
};

export const fadeDown: Variants = {
  hidden: { opacity: 0, y: -12 },
  visible: { opacity: 1, y: 0, transition: arrive },
  exit: { opacity: 0, y: -8, transition: leave },
};

export const scale: Variants = {
  hidden: { opacity: 0, scale: 0.96 },
  visible: { opacity: 1, scale: 1, transition: arrive },
  exit: { opacity: 0, scale: 0.97, transition: leave },
};

/** Springs in once with a small settle — success ticks, confirmations. */
export const pop: Variants = {
  hidden: { opacity: 0, scale: 0.6 },
  visible: { opacity: 1, scale: 1, transition: SPRING },
  exit: { opacity: 0, scale: 0.9, transition: leave },
};

/** Slides in from the reading-start edge: left in English, right in Arabic. */
export function slideFromStart(rtl: boolean): Variants {
  const from = rtl ? 24 : -24;
  return {
    hidden: { opacity: 0, x: from },
    visible: { opacity: 1, x: 0, transition: arrive },
    exit: { opacity: 0, x: from / 2, transition: leave },
  };
}

/** Slides in from the reading-end edge: right in English, left in Arabic. */
export function slideFromEnd(rtl: boolean): Variants {
  return slideFromStart(!rtl);
}

/** Wraps a list; its children using `staggerItem` arrive one after another. */
export const staggerContainer: Variants = {
  hidden: {},
  visible: { transition: { staggerChildren: STAGGER, delayChildren: 0.02 } },
  exit: { transition: { staggerChildren: STAGGER / 2, staggerDirection: -1 } },
};

export const staggerItem: Variants = {
  hidden: { opacity: 0, y: 8 },
  visible: { opacity: 1, y: 0, transition: arrive },
  exit: { opacity: 0, transition: leave },
};

/** Whole-page content when navigating: a short fade with a slight rise. */
export const page: Variants = {
  hidden: { opacity: 0, y: 6 },
  visible: { opacity: 1, y: 0, transition: { duration: DURATION.slow, ease: EASE.out } },
  exit: { opacity: 0, transition: { duration: DURATION.fast } },
};

/** Dialogs rise slightly and settle. */
export const modal: Variants = {
  hidden: { opacity: 0, scale: 0.97, y: 12 },
  visible: { opacity: 1, scale: 1, y: 0, transition: arrive },
  exit: { opacity: 0, scale: 0.97, y: 8, transition: leave },
};

/** Menus and popovers: quick, small, anchored to their button. */
export const popover: Variants = {
  hidden: { opacity: 0, scale: 0.96, y: -4 },
  visible: { opacity: 1, scale: 1, y: 0, transition: { duration: DURATION.fast, ease: EASE.out } },
  exit: { opacity: 0, scale: 0.97, transition: { duration: 0.1 } },
};

export const tooltip: Variants = {
  hidden: { opacity: 0, scale: 0.94 },
  visible: { opacity: 1, scale: 1, transition: { duration: 0.12, ease: EASE.out } },
  exit: { opacity: 0, transition: { duration: 0.08 } },
};

export type DrawerEdge = 'start' | 'end' | 'bottom';

/** Drawers slide fully in from their edge. start/end follow reading direction. */
export function drawer(edge: DrawerEdge, rtl: boolean): Variants {
  const offscreen =
    edge === 'bottom' ? { y: '100%' } : { x: (edge === 'start') !== rtl ? '-100%' : '100%' };
  const slide: Transition = { duration: 0.28, ease: EASE.out };
  return {
    hidden: offscreen,
    visible: { x: 0, y: 0, transition: slide },
    exit: { ...offscreen, transition: { duration: DURATION.normal, ease: EASE.out } },
  };
}

/** The sliding underline or pill under the selected tab. */
export const tabIndicator: Transition = { duration: 0.25, ease: EASE.out };

/** Hover lift for clickable cards. Spread onto a motion element. */
export const cardHover = {
  whileHover: { y: -2, transition: { duration: DURATION.fast, ease: EASE.out } },
  whileTap: { scale: 0.99 },
} as const;

/**
 * The reduced-motion replacement for every preset: no movement, no scaling,
 * just an almost-instant fade — the content still appears and disappears.
 */
export const reducedFade: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: DURATION.instant } },
  exit: { opacity: 0, transition: { duration: DURATION.instant } },
};
