import type { ReactNode } from 'react';
import { useTranslations } from 'next-intl';
import { PageShell } from '@afaq/ui';

export default function CompliancePage(): ReactNode {
  const t = useTranslations();
  return <PageShell title={t('nav.compliance')} description={t('common.placeholder')} />;
}
