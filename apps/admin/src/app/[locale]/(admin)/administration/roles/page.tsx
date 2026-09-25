import { getTranslations } from 'next-intl/server';
import type { ReactNode } from 'react';
import { InfoCard } from '@afaq/ui';
import { ModulePage } from '@/components/shell/module-page';

/** Built in Phase 19; the tab exists so the section is reachable. */
export default async function AdministrationRolesPage(): Promise<ReactNode> {
  const t = await getTranslations('moduleTabs');
  const tc = await getTranslations('common');

  return (
    <ModulePage
      module="administration"
      title={t('administration.roles')}
      description={t('administrationDescription')}
    >
      <InfoCard tone="neutral">{tc('placeholder')}</InfoCard>
    </ModulePage>
  );
}
