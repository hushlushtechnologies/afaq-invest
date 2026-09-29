import { getTranslations } from 'next-intl/server';
import type { ReactNode } from 'react';
import { PageShell } from '@afaq/ui';
import { CompaniesDirectory } from '@/components/companies/companies-directory';

/**
 * Companies.
 *
 * The page renders on the server; the directory needs the browser for search,
 * filters and paging. No module tabs: companies has no sections yet, and an
 * empty tab strip is worse than none.
 */
export default async function CompaniesPage(): Promise<ReactNode> {
  const t = await getTranslations('companies');

  return (
    <PageShell title={t('title')} description={t('description')}>
      <CompaniesDirectory />
    </PageShell>
  );
}
