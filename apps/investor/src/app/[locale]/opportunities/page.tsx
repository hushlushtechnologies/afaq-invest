import type { ReactNode } from 'react';
import { useTranslations } from 'next-intl';
import { PageShell } from '@afaq/ui';

export default function OpportunitiesPage(): ReactNode {
  const t = useTranslations();
  return <PageShell title={t('nav.opportunities')} description={t('common.placeholder')} />;
}
