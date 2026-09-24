import type { ReactNode } from 'react';
import { SectionHeader } from '@afaq/ui';

export interface SettingsSectionPageProps {
  title: string;
  description?: string;
  children: ReactNode;
}

/** The heading and content of one settings section. */
export function SettingsSectionPage({
  title,
  description,
  children,
}: SettingsSectionPageProps): ReactNode {
  return (
    <div className="min-w-0">
      <SectionHeader as="h2" title={title} description={description} />
      <div className="mt-5 space-y-4">{children}</div>
    </div>
  );
}
