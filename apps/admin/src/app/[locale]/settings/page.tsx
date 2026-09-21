import type { ReactNode } from 'react';
import { useTranslations } from 'next-intl';
import { PageShell } from '@afaq/ui';

export default function SettingsPage(): ReactNode {
  const t = useTranslations();
  return <PageShell title={t('nav.settings')} description={t('common.placeholder')} />;
}
