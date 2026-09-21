import type { ReactNode } from 'react';
import { useTranslations } from 'next-intl';
import { PageShell } from '@afaq/ui';

export default function RegisterPage(): ReactNode {
  const t = useTranslations();
  return <PageShell title={t('nav.register')} description={t('common.placeholder')} />;
}
