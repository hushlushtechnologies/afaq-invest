import type { ReactNode } from 'react';
import { useTranslations } from 'next-intl';
import { PageShell } from '@afaq/ui';

export default function ReportsPage(): ReactNode {
  const t = useTranslations();
  return <PageShell title={t('nav.reports')} description={t('common.placeholder')} />;
}
