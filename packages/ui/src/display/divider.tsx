import type { ReactNode } from 'react';
import { cn } from '@afaq/utils';

export interface DividerProps {
  orientation?: 'horizontal' | 'vertical';
  /** Optional centred text, e.g. "or". Horizontal only. */
  label?: ReactNode;
  className?: string;
}

export function Divider({ orientation = 'horizontal', label, className }: DividerProps): ReactNode {
  if (orientation === 'vertical') {
    return (
      <span
        role="separator"
        aria-orientation="vertical"
        className={cn('inline-block w-px self-stretch bg-border-subtle', className)}
      />
    );
  }

  if (label) {
    return (
      <div role="separator" className={cn('flex items-center gap-3', className)}>
        <span className="h-px flex-1 bg-border-subtle" />
        <span className="shrink-0 text-caption text-fg-muted">{label}</span>
        <span className="h-px flex-1 bg-border-subtle" />
      </div>
    );
  }

  return <hr className={cn('border-0 border-t border-border-subtle', className)} />;
}
