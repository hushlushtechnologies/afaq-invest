import { getTranslations } from 'next-intl/server';
import type { ReactNode } from 'react';
import { ModulePage } from '@/components/shell/module-page';
import { RolesDirectory } from '@/components/roles/roles-directory';

/**
 * Administration → Roles & permissions.
 *
 * The page renders on the server; the directory needs the browser to fetch
 * roles and open the detail drawer.
 */
export default async function AdministrationRolesPage(): Promise<ReactNode> {
  const t = await getTranslations('roles');

  return (
    <ModulePage module="administration" title={t('title')} description={t('description')}>
      <RolesDirectory />
    </ModulePage>
  );
}
