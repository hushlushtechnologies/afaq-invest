import type { ReactNode } from 'react';
import { useTranslations } from 'next-intl';
import { PageShell } from '@afaq/ui';

export default function DashboardPage(): ReactNode {
  const t = useTranslations();
  return <PageShell title={t('nav.dashboard')} description={t('common.placeholder')} />;
}
