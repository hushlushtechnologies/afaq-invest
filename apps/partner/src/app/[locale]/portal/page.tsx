import type { ReactNode } from 'react';
import { useTranslations } from 'next-intl';
import { PageShell } from '@afaq/ui';

export default function PortalPage(): ReactNode {
  const t = useTranslations();
  return <PageShell title={t('nav.portal')} description={t('common.placeholder')} />;
}
