import type { ReactNode } from 'react';
import { cn } from '@afaq/utils';

export interface PageHeaderProps {
  title: ReactNode;
  description?: ReactNode;
  /** Small label above the title, e.g. the module name. */
  eyebrow?: ReactNode;
  /** Usually a <Breadcrumb>. Sits above everything else. */
  breadcrumb?: ReactNode;
  /** Buttons on the trailing side. Wrap under the title on narrow screens. */
  actions?: ReactNode;
  /** Badges or metadata under the description. */
  meta?: ReactNode;
  className?: string;
}

/** The top of a page: where you are, what this is, and the main actions. */
export function PageHeader({
  title,
  description,
  eyebrow,
  breadcrumb,
  actions,
  meta,
  className,
}: PageHeaderProps): ReactNode {
  return (
    <header className={cn('border-b border-border-subtle pb-5', className)}>
      {breadcrumb ? <div className="mb-4">{breadcrumb}</div> : null}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0">
          {eyebrow ? <p className="mb-2 text-overline text-primary">{eyebrow}</p> : null}
          <h1 className="text-h2 text-fg">{title}</h1>
          {description ? (
            <p className="mt-2 max-w-2xl text-body text-fg-subtle">{description}</p>
          ) : null}
          {meta ? <div className="mt-3 flex flex-wrap items-center gap-2">{meta}</div> : null}
        </div>
        {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
      </div>
    </header>
  );
}
