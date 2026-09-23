import type { ReactNode } from 'react';
import { cn } from '@afaq/utils';

export interface ButtonGroupProps {
  children: ReactNode;
  /** Describes the group to screen readers, e.g. "View mode". */
  label?: string;
  className?: string;
}

/**
 * Joins buttons into one segmented control. Uses start/end corner rounding,
 * so the outer corners stay correct in Arabic.
 */
export function ButtonGroup({ children, label, className }: ButtonGroupProps): ReactNode {
  return (
    <div
      role="group"
      aria-label={label}
      className={cn(
        'inline-flex items-center',
        '[&>*:not(:first-child)]:-ms-px [&>*:not(:first-child)]:rounded-s-none',
        '[&>*:not(:last-child)]:rounded-e-none',
        className,
      )}
    >
      {children}
    </div>
  );
}
