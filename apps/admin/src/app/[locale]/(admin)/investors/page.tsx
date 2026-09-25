import type { ReactNode } from 'react';
import { useTranslations } from 'next-intl';
import { PageShell } from '@afaq/ui';

export default function InvestorsPage(): ReactNode {
  const t = useTranslations();
  return <PageShell title={t('nav.investors')} description={t('common.placeholder')} />;
}
