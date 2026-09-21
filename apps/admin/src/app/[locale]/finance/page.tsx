import type { ReactNode } from 'react';
import { useTranslations } from 'next-intl';
import { PageShell } from '@afaq/ui';

export default function FinancePage(): ReactNode {
  const t = useTranslations();
  return <PageShell title={t('nav.finance')} description={t('common.placeholder')} />;
}
