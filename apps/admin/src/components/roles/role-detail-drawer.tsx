'use client';

import { useTranslations } from 'next-intl';
import type { ReactNode } from 'react';
import type { RoleListItem } from '@afaq/types';
import { Badge, Button, Drawer, ErrorState, InfoCard, LoadingState } from '@afaq/ui';
import { usePermissionCatalogue, useRole } from '@/lib/roles/use-roles';
import { PermissionMatrix } from './permission-matrix';

/**
 * One role, and everything it grants.
 *
 * The permissions are fetched fresh rather than taken from the list row: the
 * list carries only a count, and a count is not an answer to "what can they
 * actually do?"
 */
export function RoleDetailDrawer({
  role,
  onClose,
}: {
  role: RoleListItem | null;
  onClose: () => void;
}): ReactNode {
  const t = useTranslations('roles');

  const detail = useRole(role?.id ?? null);
  const catalogue = usePermissionCatalogue();

  const isLoading = detail.isPending || catalogue.isPending;
  const failed = detail.isError || catalogue.isError;

  return (
    <Drawer
      open={role !== null}
      onClose={onClose}
      side="end"
      size="lg"
      title={role?.name ?? ''}
      description={role?.description ?? undefined}
      footer={
        <Button variant="outline" onClick={onClose}>
          {t('close')}
        </Button>
      }
    >
      <div className="space-y-5">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant={role?.isSystem ? 'info' : 'neutral'} size="sm">
            {role?.isSystem ? t('systemRole') : t('customRole')}
          </Badge>
          <Badge variant="neutral" size="sm">
            {t('staffCount', { count: role?.staffCount ?? 0 })}
          </Badge>
          <code className="text-caption text-fg-subtle">{role?.key}</code>
        </div>

        {role?.isSuperAdmin ? <InfoCard tone="warning">{t('superAdminNote')}</InfoCard> : null}

        {failed ? (
          <ErrorState
            title={t('loadFailedTitle')}
            description={t('loadFailedDescription')}
            onRetry={() => {
              void detail.refetch();
              void catalogue.refetch();
            }}
          />
        ) : isLoading ? (
          <LoadingState />
        ) : (
          <PermissionMatrix
            groups={catalogue.data ?? []}
            granted={detail.data?.permissionKeys ?? []}
            grantsEverything={role?.isSuperAdmin ?? false}
          />
        )}
      </div>
    </Drawer>
  );
}
