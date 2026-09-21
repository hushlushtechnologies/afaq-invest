import type { ReactNode } from 'react';
import { useTranslations } from 'next-intl';
import { PageShell } from '@afaq/ui';

export default function AboutPage(): ReactNode {
  const t = useTranslations();
  return <PageShell title={t('nav.about')} description={t('common.placeholder')} />;
}
