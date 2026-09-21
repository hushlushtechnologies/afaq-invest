import type { ReactNode } from 'react';
import { useTranslations } from 'next-intl';
import { PageShell } from '@afaq/ui';

export default function CompaniesPage(): ReactNode {
  const t = useTranslations();
  return <PageShell title={t('nav.companies')} description={t('common.placeholder')} />;
}
