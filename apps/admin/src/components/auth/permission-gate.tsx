'use client';

import { useTranslations } from 'next-intl';
import type { ReactNode } from 'react';
import type { PermissionKey } from '@afaq/types';
import { Button, LoadingState, NoPermissionState } from '@afaq/ui';
import { Link } from '@/i18n/navigation';
import { usePermissions } from '@/lib/auth/use-permissions';
import { AccountBlocked, isBlockingReason } from './account-blocked';

export interface PermissionGateProps {
  /** Required to see the page. */
  permission?: PermissionKey;
  /** Or any one of these. */
  anyOf?: readonly PermissionKey[];
  /** Or all of these. */
  allOf?: readonly PermissionKey[];
  children: ReactNode;
}

/**
 * Guards a whole page.
 *
 * Hiding the link to a page is not access control — anyone can type the
 * address — so every page that needs a permission says so here, and the API
 * refuses the data regardless. This is what somebody sees when they arrive
 * somewhere they should not be.
 *
 * The message says what is missing, not just "denied": a person who has been
 * sent a link by a colleague needs to know what to ask for.
 */
export function PermissionGate({
  permission,
  anyOf,
  allOf,
  children,
}: PermissionGateProps): ReactNode {
  const t = useTranslations('accessDenied');
  const { can, canAny, canAll, loading, refusalReason } = usePermissions();

  if (loading) return <LoadingState />;

  // An account-level refusal outranks any page permission: telling a
  // suspended person they lack staff.view would be answering the wrong
  // question entirely.
  if (isBlockingReason(refusalReason)) return <AccountBlocked reason={refusalReason} />;

  const allowed =
    (permission ? can(permission) : true) &&
    (anyOf ? canAny(anyOf) : true) &&
    (allOf ? canAll(allOf) : true);

  if (allowed) return children;

  return (
    <NoPermissionState
      title={t('title')}
      description={t('description')}
      actions={
        <Button variant="outline" asChild>
          <Link href="/dashboard">{t('goToDashboard')}</Link>
        </Button>
      }
    />
  );
}
