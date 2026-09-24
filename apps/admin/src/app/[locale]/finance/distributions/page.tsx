import { getTranslations } from 'next-intl/server';
import type { ReactNode } from 'react';
import { InfoCard } from '@afaq/ui';
import { ModulePage } from '@/components/shell/module-page';

export default async function FinanceDistributionsPage(): Promise<ReactNode> {
  const t = await getTranslations('moduleTabs');
  const tc = await getTranslations('common');

  return (
    <ModulePage
      module="finance"
      title={t('finance.distributions')}
      description={t('financeDescription')}
      counts={{ distributions: 3 }}
    >
      <InfoCard tone="neutral">{tc('placeholder')}</InfoCard>
    </ModulePage>
  );
}
