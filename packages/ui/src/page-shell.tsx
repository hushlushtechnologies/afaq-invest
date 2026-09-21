import type { ReactNode } from 'react';
import { cn } from '@afaq/utils';

export interface PageShellProps {
  title: string;
  description?: string;
  className?: string;
  children?: ReactNode;
}

export function PageShell({ title, description, className, children }: PageShellProps): ReactNode {
  return (
    <section className={cn('mx-auto w-full max-w-5xl px-6 py-10', className)}>
      <header className="border-b border-neutral-200 pb-5 dark:border-neutral-800">
        <h1 className="text-2xl font-semibold text-neutral-900 dark:text-neutral-50">{title}</h1>
        {description ? (
          <p className="mt-2 text-sm text-neutral-600 dark:text-neutral-400">{description}</p>
        ) : null}
      </header>
      {children ? <div className="pt-6">{children}</div> : null}
    </section>
  );
}
