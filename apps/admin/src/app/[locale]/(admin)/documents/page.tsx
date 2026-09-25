import type { ReactNode } from 'react';
import { useTranslations } from 'next-intl';
import { PageShell } from '@afaq/ui';

export default function DocumentsPage(): ReactNode {
  const t = useTranslations();
  return <PageShell title={t('nav.documents')} description={t('common.placeholder')} />;
}
