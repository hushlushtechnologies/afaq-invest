'use client';

import { motion } from 'framer-motion';
import { Check } from 'lucide-react';
import type { ReactNode } from 'react';
import { useMotionPreset } from '../motion/use-motion-preset';
import { StateView, type StateSize } from './state-view';

export interface SuccessStateProps {
  title: ReactNode;
  description?: ReactNode;
  /** What to do next, e.g. "View investment" and "Back to dashboard". */
  actions?: ReactNode;
  illustration?: ReactNode;
  size?: StateSize;
  className?: string;
}

/** Confirms a completed action. The tick settles in once; it never loops. */
export function SuccessState({
  title,
  description,
  actions,
  illustration,
  size = 'md',
  className,
}: SuccessStateProps): ReactNode {
  const motionProps = useMotionPreset('pop');

  const tick = (
    <motion.span {...motionProps} className="flex">
      <Check strokeWidth={3} />
    </motion.span>
  );

  return (
    <StateView
      icon={tick}
      illustration={illustration}
      tone="success"
      title={title}
      description={description}
      actions={actions}
      size={size}
      announce="status"
      className={className}
    />
  );
}
