import type { ReactNode } from 'react';
import { useTranslations } from 'next-intl';
import { PageShell } from '@afaq/ui';

export default function SupportPage(): ReactNode {
  const t = useTranslations();
  return <PageShell title={t('nav.support')} description={t('common.placeholder')} />;
}
