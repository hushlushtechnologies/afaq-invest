'use client';

import { useTranslations } from 'next-intl';
import type { ReactNode } from 'react';
import { LoadingState, NoPermissionState } from '@afaq/ui';
import { usePermissions } from '@/lib/auth/use-permissions';
import { StaffTable } from './staff-table';

/**
 * The staff directory, behind its permission.
 *
 * Someone without staff.view is told plainly rather than shown an empty table
 * that appears broken. The API refuses them regardless; this is about the
 * message they see.
 */
export function StaffDirectory(): ReactNode {
  const t = useTranslations('staff');
  const { can, loading } = usePermissions();

  if (loading) return <LoadingState />;

  if (!can('staff.view')) {
    return <NoPermissionState title={t('noAccessTitle')} description={t('noAccessDescription')} />;
  }

  return <StaffTable />;
}
