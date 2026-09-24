'use client';

import Image from 'next/image';
import type { ReactNode } from 'react';

import { cn } from '@afaq/utils';

export interface LogoProps {
  /**
   * Full SVG logo or mark-only SVG.
   */
  variant?: 'full' | 'mark';

  /**
   * Kept in the API so existing usages don't need to change.
   * SVG assets themselves control the visual appearance.
   */
  tone?: 'sidebar' | 'default';

  className?: string;
}

export function Logo({ variant = 'full', className }: LogoProps): ReactNode {
  const isMark = variant === 'mark';

  return (
    <span
      className={cn(
        'relative inline-flex shrink-0 items-center',
        isMark ? 'size-10' : 'h-10 w-auto',
        className,
      )}
    >
      <Image
        src={isMark ? '/logo/logo-mark.svg' : '/logo/logo-full.svg'}
        alt="Afaq Invest"
        width={isMark ? 44 : 150}
        height={44}
        priority
        className={cn('block', 'h-full', isMark ? 'w-full' : 'w-auto', 'object-contain')}
      />
    </span>
  );
}
