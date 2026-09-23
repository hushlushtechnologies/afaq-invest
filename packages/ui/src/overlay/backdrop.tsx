'use client';

import { motion } from 'framer-motion';
import type { ReactNode } from 'react';
import { cn } from '@afaq/utils';
import { useMotionPreset } from '../motion/use-motion-preset';

export interface BackdropProps {
  onClick?: () => void;
  className?: string;
}

/** The dimmed layer behind a dialog or drawer. */
export function Backdrop({ onClick, className }: BackdropProps): ReactNode {
  const motionProps = useMotionPreset('fade');

  return (
    <motion.div
      aria-hidden="true"
      onClick={onClick}
      {...motionProps}
      className={cn('fixed inset-0 bg-neutral-950/50 backdrop-blur-[2px]', className)}
    />
  );
}
