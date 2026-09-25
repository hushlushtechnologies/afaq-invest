import { getTranslations } from 'next-intl/server';
import type { ReactNode } from 'react';
import { InfoCard } from '@afaq/ui';
import { PermissionGate } from '@/components/auth/permission-gate';
import { ModulePage } from '@/components/shell/module-page';

/** Built in Phase 27; the tab exists so the section is reachable. */
export default async function AdministrationAuditPage(): Promise<ReactNode> {
  const t = await getTranslations('moduleTabs');
  const tc = await getTranslations('common');

  return (
    <ModulePage
      module="administration"
      title={t('administration.audit')}
      description={t('administrationDescription')}
    >
      <PermissionGate permission="audit.view">
        <InfoCard tone="neutral">{tc('placeholder')}</InfoCard>
      </PermissionGate>
    </ModulePage>
  );
}
