'use client';

import { useReducedMotion, type Transition, type Variants } from 'framer-motion';
import { useIsRtl } from '../hooks/use-is-rtl';
import {
  drawer,
  fade,
  fadeDown,
  fadeUp,
  modal,
  page,
  pop,
  popover,
  reducedFade,
  scale,
  slideFromEnd,
  slideFromStart,
  staggerContainer,
  staggerItem,
  tabIndicator,
  tooltip,
  type DrawerEdge,
} from './presets';

export type MotionPresetName =
  | 'fade'
  | 'fadeUp'
  | 'fadeDown'
  | 'scale'
  | 'pop'
  | 'slideFromStart'
  | 'slideFromEnd'
  | 'staggerContainer'
  | 'staggerItem'
  | 'page'
  | 'modal'
  | 'popover'
  | 'tooltip'
  | 'drawerStart'
  | 'drawerEnd'
  | 'drawerBottom';

export interface MotionPresetProps {
  variants: Variants;
  initial: 'hidden';
  animate: 'visible';
  exit: 'exit';
}

function presetFor(name: MotionPresetName, rtl: boolean): Variants {
  switch (name) {
    case 'fade':
      return fade;
    case 'fadeUp':
      return fadeUp;
    case 'fadeDown':
      return fadeDown;
    case 'scale':
      return scale;
    case 'pop':
      return pop;
    case 'slideFromStart':
      return slideFromStart(rtl);
    case 'slideFromEnd':
      return slideFromEnd(rtl);
    case 'staggerContainer':
      return staggerContainer;
    case 'staggerItem':
      return staggerItem;
    case 'page':
      return page;
    case 'modal':
      return modal;
    case 'popover':
      return popover;
    case 'tooltip':
      return tooltip;
    case 'drawerStart':
      return drawer('start' satisfies DrawerEdge, rtl);
    case 'drawerEnd':
      return drawer('end', rtl);
    case 'drawerBottom':
      return drawer('bottom', rtl);
  }
}

/**
 * The one way components animate. Returns props to spread on a motion element:
 *
 *   <motion.div {...useMotionPreset('fadeUp')} />
 *
 * People who ask their device for reduced motion get a near-instant fade
 * instead — decided here once, not in every component. Containers keep their
 * staggering structure but without delays.
 */
export function useMotionPreset(name: MotionPresetName): MotionPresetProps {
  const reduced = useReducedMotion();
  const rtl = useIsRtl();

  const variants = reduced
    ? name === 'staggerContainer'
      ? { hidden: {}, visible: {}, exit: {} }
      : reducedFade
    : presetFor(name, rtl);

  return { variants, initial: 'hidden', animate: 'visible', exit: 'exit' };
}

/** The transition for moving shared elements (tab indicators), reduced-motion aware. */
export function useIndicatorTransition(): Transition {
  const reduced = useReducedMotion();
  return reduced ? { duration: 0 } : tabIndicator;
}
