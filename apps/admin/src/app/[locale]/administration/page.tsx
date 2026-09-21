import type { ReactNode } from 'react';
import { useTranslations } from 'next-intl';
import { PageShell } from '@afaq/ui';

export default function AdministrationPage(): ReactNode {
  const t = useTranslations();
  return <PageShell title={t('nav.administration')} description={t('common.placeholder')} />;
}
