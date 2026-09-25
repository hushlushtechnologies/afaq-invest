'use client';

import { useTranslations } from 'next-intl';
import type { ReactNode } from 'react';
import { LoadingState, NoPermissionState } from '@afaq/ui';
import { usePermissions } from '@/lib/auth/use-permissions';
import { RolesGrid } from './roles-grid';

/**
 * Roles and permissions, behind the permission to see them.
 *
 * Someone without role.view is told plainly rather than shown an empty screen
 * that looks broken. The API refuses them regardless; this is about the
 * message they get.
 */
export function RolesDirectory(): ReactNode {
  const t = useTranslations('roles');
  const { can, loading } = usePermissions();

  if (loading) return <LoadingState />;

  if (!can('role.view')) {
    return <NoPermissionState title={t('noAccessTitle')} description={t('noAccessDescription')} />;
  }

  return <RolesGrid />;
}
