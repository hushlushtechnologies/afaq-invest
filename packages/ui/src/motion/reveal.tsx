'use client';

import { motion } from 'framer-motion';
import type { ReactNode } from 'react';

import { useMotionPreset, type MotionPresetName } from './use-motion-preset';

export interface RevealProps {
  children: ReactNode;

  preset?: Extract<
    MotionPresetName,
    'fade' | 'fadeUp' | 'fadeDown' | 'scale' | 'slideFromStart' | 'slideFromEnd'
  >;

  /** Seconds to wait before starting. */
  delay?: number;

  className?: string;
}

/**
 * Animates its content in once, when it first appears.
 */
export function Reveal({
  children,
  preset = 'fadeUp',
  delay = 0,
  className,
}: RevealProps): ReactNode {
  const motionProps = useMotionPreset(preset);

  return (
    <motion.div {...motionProps} transition={delay ? { delay } : undefined} className={className}>
      {children}
    </motion.div>
  );
}

export interface StaggerProps {
  children: ReactNode;
  className?: string;

  /** Render as a list: ul or ol. Defaults to div. */
  as?: 'div' | 'ul' | 'ol';
}

/**
 * A group whose StaggerItem children arrive one after another.
 */
export function Stagger({ children, className, as = 'div' }: StaggerProps): ReactNode {
  const motionProps = useMotionPreset('staggerContainer');

  if (as === 'ul') {
    return (
      <motion.ul {...motionProps} className={className}>
        {children}
      </motion.ul>
    );
  }

  if (as === 'ol') {
    return (
      <motion.ol {...motionProps} className={className}>
        {children}
      </motion.ol>
    );
  }

  return (
    <motion.div {...motionProps} className={className}>
      {children}
    </motion.div>
  );
}

export interface StaggerItemProps {
  children: ReactNode;
  className?: string;

  /** Render as a list item inside Stagger as="ul". */
  as?: 'div' | 'li';
}

export function StaggerItem({ children, className, as = 'div' }: StaggerItemProps): ReactNode {
  const motionProps = useMotionPreset('staggerItem');

  if (as === 'li') {
    return (
      <motion.li variants={motionProps.variants} className={className}>
        {children}
      </motion.li>
    );
  }

  return (
    <motion.div variants={motionProps.variants} className={className}>
      {children}
    </motion.div>
  );
}
