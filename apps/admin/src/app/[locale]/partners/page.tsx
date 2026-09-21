import type { ReactNode } from 'react';
import { useTranslations } from 'next-intl';
import { PageShell } from '@afaq/ui';

export default function PartnersPage(): ReactNode {
  const t = useTranslations();
  return <PageShell title={t('nav.partners')} description={t('common.placeholder')} />;
}
