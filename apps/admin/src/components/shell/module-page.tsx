import type { ReactNode } from 'react';
import { PageShell } from '@afaq/ui';
import type { NavModule } from '@/config/navigation';
import { ModuleTabs } from './module-tabs';

export interface ModulePageProps {
  /** The module these tabs belong to. */
  module: NavModule['key'];
  title: string;
  description?: string;
  counts?: Record<string, number>;
  children?: ReactNode;
}

/**
 * A page inside a module: the page header, the section tabs, then content.
 * Every section page uses it, so the tabs sit in exactly the same place
 * whichever section you are on.
 */
export function ModulePage({
  module,
  title,
  description,
  counts,
  children,
}: ModulePageProps): ReactNode {
  return (
    <PageShell title={title} description={description}>
      <ModuleTabs module={module} counts={counts} />
      {children}
    </PageShell>
  );
}
