'use client';

import { useTranslations } from 'next-intl';
import type { ReactNode } from 'react';
import type { StaffStatus } from '@afaq/types';
import { StatusBadge, type StatusKind } from '@afaq/ui';

/**
 * What a staff member's status looks like.
 *
 * INVITED is deliberately "pending" rather than a warning: an invitation
 * waiting to be accepted is a normal state, not a problem. Suspended and
 * disabled are the ones worth noticing.
 */
const TONES: Record<StaffStatus, StatusKind> = {
  INVITED: 'pending',
  ACTIVE: 'active',
  SUSPENDED: 'suspended',
  DISABLED: 'cancelled',
};

export function StaffStatusBadge({ status }: { status: StaffStatus }): ReactNode {
  const t = useTranslations('staff.status');
  return <StatusBadge status={TONES[status]} label={t(status)} />;
}
