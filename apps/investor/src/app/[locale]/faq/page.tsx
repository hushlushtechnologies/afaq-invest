import type { ReactNode } from 'react';
import { useTranslations } from 'next-intl';
import { PageShell } from '@afaq/ui';

export default function FaqPage(): ReactNode {
  const t = useTranslations();
  return <PageShell title={t('nav.faq')} description={t('common.placeholder')} />;
}
