import { getTranslations } from 'next-intl/server';
import type { ReactNode } from 'react';
import { ModulePage } from '@/components/shell/module-page';
import { StaffDirectory } from '@/components/staff/staff-directory';

/**
 * Administration → Staff.
 *
 * The page itself renders on the server; the directory needs the browser for
 * search, filters and paging.
 */
export default async function StaffPage(): Promise<ReactNode> {
  const t = await getTranslations('staff');

  return (
    <ModulePage module="administration" title={t('title')} description={t('description')}>
      <StaffDirectory />
    </ModulePage>
  );
}
