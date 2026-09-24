import { getTranslations } from 'next-intl/server';
import type { ReactNode } from 'react';
import { InfoCard } from '@afaq/ui';
import { ModulePage } from '@/components/shell/module-page';

export default async function InvestorsAllPage(): Promise<ReactNode> {
  const t = await getTranslations('moduleTabs');
  const tc = await getTranslations('common');

  return (
    <ModulePage
      module="investors"
      title={t('investors.all')}
      description={t('investorsDescription')}
      counts={{ kyc: 7 }}
    >
      <InfoCard tone="neutral">{tc('placeholder')}</InfoCard>
    </ModulePage>
  );
}
