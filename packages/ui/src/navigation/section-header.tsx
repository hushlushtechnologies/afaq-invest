import type { ReactNode } from 'react';
import { cn } from '@afaq/utils';

export interface SectionHeaderProps {
  title: ReactNode;
  description?: ReactNode;
  /** A button or link on the trailing side, e.g. "View all". */
  action?: ReactNode;
  /** The heading level. Use h2 for sections of a page, h3 inside cards. */
  as?: 'h2' | 'h3';
  className?: string;
}

/** Titles a section inside a page. Smaller than the page title. */
export function SectionHeader({
  title,
  description,
  action,
  as: Heading = 'h2',
  className,
}: SectionHeaderProps): ReactNode {
  return (
    <div className={cn('flex flex-wrap items-end justify-between gap-3', className)}>
      <div className="min-w-0">
        <Heading className={cn('text-fg', Heading === 'h2' ? 'text-h4' : 'text-h5')}>
          {title}
        </Heading>
        {description ? <p className="mt-1 text-body-small text-fg-subtle">{description}</p> : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}
