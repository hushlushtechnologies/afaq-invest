'use client';

import { AnimatePresence, motion } from 'framer-motion';
import type { ReactNode } from 'react';
import { useMotionPreset } from './use-motion-preset';

export interface PageTransitionProps {
  children: ReactNode;
  /** Changes on navigation — usually the current pathname. */
  routeKey: string;
  className?: string;
}

/**
 * Fades page content when the route changes. The old page leaves before the
 * new one arrives ('wait'), so two pages never overlap.
 */
export function PageTransition({ children, routeKey, className }: PageTransitionProps): ReactNode {
  const motionProps = useMotionPreset('page');
  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div key={routeKey} {...motionProps} className={className}>
        {children}
      </motion.div>
    </AnimatePresence>
  );
}
