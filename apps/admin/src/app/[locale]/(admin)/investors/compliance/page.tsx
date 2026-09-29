import { getTranslations } from 'next-intl/server';
import type { ReactNode } from 'react';
import { InfoCard } from '@afaq/ui';
import { ModulePage } from '@/components/shell/module-page';

/**
 * Investors → Compliance.
 *
 * Placeholder until the Investor phases. It lives here rather than under
 * /investments, where a copy of it sat outside the admin layout group and so
 * rendered with no sidebar — while the tab that points at this address
 * returned a 404.
 */
export default async function InvestorsCompliancePage(): Promise<ReactNode> {
  const t = await getTranslations('moduleTabs');
  const tc = await getTranslations('common');

  return (
    <ModulePage
      module="investors"
      title={t('investors.compliance')}
      description={t('investorsDescription')}
    >
      <InfoCard tone="neutral">{tc('placeholder')}</InfoCard>
    </ModulePage>
  );
}
