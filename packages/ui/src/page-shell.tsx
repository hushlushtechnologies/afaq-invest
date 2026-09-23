import type { ReactNode } from 'react';
import { cn } from '@afaq/utils';
import { PageHeader } from './navigation/page-header';

export interface PageShellProps {
  title: string;
  description?: string;
  eyebrow?: string;
  breadcrumb?: ReactNode;
  actions?: ReactNode;
  className?: string;
  children?: ReactNode;
}

/** A standard page: container, header, and consistent spacing between sections. */
export function PageShell({
  title,
  description,
  eyebrow,
  breadcrumb,
  actions,
  className,
  children,
}: PageShellProps): ReactNode {
  return (
    <section className={cn('container-page page-padding', className)}>
      <PageHeader
        title={title}
        description={description}
        eyebrow={eyebrow}
        breadcrumb={breadcrumb}
        actions={actions}
      />
      {children ? <div className="section-gap pt-8">{children}</div> : null}
    </section>
  );
}
