import type { ReactNode } from 'react';
import { useTranslations } from 'next-intl';
import { PageShell } from '@afaq/ui';

export default function HomePage(): ReactNode {
  const t = useTranslations('common');
  return <PageShell title={t('appName')} description={t('tagline')} />;
}
