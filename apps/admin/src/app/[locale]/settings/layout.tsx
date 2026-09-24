import { getTranslations } from 'next-intl/server';
import type { ReactNode } from 'react';
import { PageShell } from '@afaq/ui';
import { SettingsNav } from '@/components/settings/settings-nav';

/**
 * The frame around every settings page: one heading, the section navigation,
 * and the section's own content. Because it is a layout, moving between
 * sections replaces only the content — the navigation never reloads.
 */
export default async function SettingsLayout({
  children,
}: Readonly<{ children: ReactNode }>): Promise<ReactNode> {
  const t = await getTranslations('settings');

  return (
    <PageShell title={t('title')} description={t('description')}>
      <div className="flex flex-col gap-6 lg:flex-row lg:gap-10">
        <div className="lg:w-56 lg:shrink-0">
          <SettingsNav />
        </div>
        <div className="min-w-0 flex-1">{children}</div>
      </div>
    </PageShell>
  );
}
