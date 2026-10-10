import { getTranslations } from 'next-intl/server';
import type { ReactNode } from 'react';
import { ModulePage } from '@/components/shell/module-page';
import { OpportunitiesDirectory } from '@/components/opportunities/opportunities-directory';

/**
 * Investments → Opportunities.
 *
 * The page renders on the server; the directory needs the browser for its
 * search, filters and paging. A module page, so the tabs sit in the same place
 * as every other module's.
 */
export default async function OpportunitiesPage(): Promise<ReactNode> {
  const t = await getTranslations('opportunities');
  const tTabs = await getTranslations('moduleTabs');

  return (
    <ModulePage
      module="investments"
      title={t('title')}
      description={tTabs('investmentsDescription')}
    >
      <OpportunitiesDirectory />
    </ModulePage>
  );
}
