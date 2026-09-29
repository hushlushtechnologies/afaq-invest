import { getTranslations } from 'next-intl/server';
import type { ReactNode } from 'react';
import { ModulePage } from '@/components/shell/module-page';
import { InvestmentRulesDirectory } from '@/components/investment-rules/investment-rules-directory';

/**
 * Investments → Rules.
 *
 * The page renders on the server; the directory needs the browser for its
 * filters and paging. A module page rather than a plain shell, so the tabs
 * sit in the same place as every other module's.
 */
export default async function InvestmentRulesPage(): Promise<ReactNode> {
  const t = await getTranslations('investmentRules');
  const tTabs = await getTranslations('moduleTabs');

  return (
    <ModulePage
      module="investments"
      title={t('title')}
      description={tTabs('investmentsDescription')}
    >
      <InvestmentRulesDirectory />
    </ModulePage>
  );
}
