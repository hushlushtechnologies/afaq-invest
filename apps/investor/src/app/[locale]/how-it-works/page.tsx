import type { ReactNode } from 'react';
import { useTranslations } from 'next-intl';
import { PageShell } from '@afaq/ui';

export default function HowItWorksPage(): ReactNode {
  const t = useTranslations();
  return <PageShell title={t('nav.howItWorks')} description={t('common.placeholder')} />;
}
