import type { ReactNode } from 'react';
import { useTranslations } from 'next-intl';
import { PageShell } from '@afaq/ui';

export default function SignInPage(): ReactNode {
  const t = useTranslations();
  return <PageShell title={t('nav.signIn')} description={t('common.placeholder')} />;
}
