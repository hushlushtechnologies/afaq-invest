import type { ReactNode } from 'react';
import { cn } from '@afaq/utils';

export interface NavGroupProps {
  /** Group heading, e.g. "Finance". Hidden visually when collapsed. */
  title?: string;
  children: ReactNode;
  collapsed?: boolean;
  variant?: 'sidebar' | 'default';
  className?: string;
}

/** A labelled set of NavItems. */
export function NavGroup({
  title,
  children,
  collapsed = false,
  variant = 'default',
  className,
}: NavGroupProps): ReactNode {
  return (
    <div role="group" aria-label={title} className={cn('flex flex-col gap-0.5', className)}>
      {title ? (
        collapsed ? (
          // A thin divider keeps groups visually separate in the icon-only rail.
          <span
            aria-hidden="true"
            className={cn(
              'mx-auto my-2 h-px w-6',
              variant === 'sidebar' ? 'bg-sidebar-border' : 'bg-border',
            )}
          />
        ) : (
          <p
            aria-hidden="true"
            className={cn(
              'px-3 pt-4 pb-1.5 text-overline',
              variant === 'sidebar' ? 'text-sidebar-text-muted' : 'text-fg-muted',
            )}
          >
            {title}
          </p>
        )
      ) : null}
      {children}
    </div>
  );
}
