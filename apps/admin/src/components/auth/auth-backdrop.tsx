'use client';

import { motion, useReducedMotion } from 'framer-motion';
import type { ReactNode } from 'react';

/**
 * The slow-moving light behind the brand panel.
 *
 * Two large, heavily blurred emerald shapes drifting on long cycles. At this
 * size and blur the movement reads as depth rather than animation — the point
 * is that the panel feels alive, not that anything is moving.
 *
 * With reduced motion the shapes stay exactly where they are.
 */
export function AuthBackdrop(): ReactNode {
  const reduced = useReducedMotion();

  const drift = (x: number[], y: number[], duration: number) =>
    reduced
      ? undefined
      : {
          x,
          y,
          transition: {
            duration,
            repeat: Infinity,
            repeatType: 'mirror' as const,
            ease: 'easeInOut' as const,
          },
        };

  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
      <motion.span
        animate={drift([0, 40, -20, 0], [0, -30, 20, 0], 26)}
        className="absolute -start-20 -top-24 size-[28rem] rounded-full bg-primary/25 blur-[120px]"
      />
      <motion.span
        animate={drift([0, -30, 25, 0], [0, 25, -15, 0], 32)}
        className="absolute end-0 -bottom-32 size-[32rem] rounded-full bg-accent/12 blur-[140px]"
      />
      {/* A faint grid gives the blur something to sit against. */}
      <span
        className="absolute inset-0 opacity-[0.06]"
        style={{
          backgroundImage:
            'linear-gradient(to right, white 1px, transparent 1px), linear-gradient(to bottom, white 1px, transparent 1px)',
          backgroundSize: '56px 56px',
          maskImage: 'radial-gradient(ellipse at center, black 40%, transparent 78%)',
        }}
      />
    </div>
  );
}
