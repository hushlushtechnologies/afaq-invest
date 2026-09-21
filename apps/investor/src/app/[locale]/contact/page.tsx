import type { ReactNode } from 'react';
import { useTranslations } from 'next-intl';
import { PageShell } from '@afaq/ui';

export default function ContactPage(): ReactNode {
  const t = useTranslations();
  return <PageShell title={t('nav.contact')} description={t('common.placeholder')} />;
}
