import type { ReactNode } from 'react';
import { cn } from '@afaq/utils';

export type SpinnerSize = 'xs' | 'sm' | 'md' | 'lg';

const SIZES: Record<SpinnerSize, string> = {
  xs: 'size-3 border-[1.5px]',
  sm: 'size-3.5 border-[1.5px]',
  md: 'size-4 border-2',
  lg: 'size-5 border-2',
};

export interface SpinnerProps {
  size?: SpinnerSize;
  /** Read by screen readers. */
  label?: string;
  className?: string;
}

/**
 * A spinning ring. Takes its colour from the surrounding text (border-current),
 * so it works on every button and background without overrides.
 */
export function Spinner({ size = 'md', label = 'Loading', className }: SpinnerProps): ReactNode {
  return (
    <span
      role="status"
      className={cn(
        'inline-block shrink-0 animate-spin rounded-full border-current border-e-transparent',
        SIZES[size],
        className,
      )}
    >
      <span className="sr-only">{label}</span>
    </span>
  );
}
