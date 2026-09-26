import { getTranslations } from 'next-intl/server';
import type { ReactNode } from 'react';
import { AuditViewer } from '@/components/audit/audit-viewer';
import { ModulePage } from '@/components/shell/module-page';

/** Administration → Audit. The viewer gates itself on audit.view. */
export default async function AdministrationAuditPage(): Promise<ReactNode> {
  const t = await getTranslations('moduleTabs');

  return (
    <ModulePage
      module="administration"
      title={t('administration.audit')}
      description={t('administrationDescription')}
    >
      <AuditViewer />
    </ModulePage>
  );
}
