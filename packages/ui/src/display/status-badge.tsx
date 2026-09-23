import type { ReactNode } from 'react';
import { Badge, type BadgeProps, type BadgeVariant } from './badge';

/** The statuses used across the platform, so "pending" always looks the same. */
export type StatusKind =
  | 'draft'
  | 'pending'
  | 'under-review'
  | 'approved'
  | 'active'
  | 'rejected'
  | 'expired'
  | 'suspended'
  | 'completed'
  | 'cancelled';

const STATUS_VARIANTS: Record<StatusKind, BadgeVariant> = {
  draft: 'neutral',
  pending: 'warning',
  'under-review': 'info',
  approved: 'success',
  active: 'success',
  rejected: 'danger',
  expired: 'neutral',
  suspended: 'danger',
  completed: 'primary',
  cancelled: 'neutral',
};

const DEFAULT_LABELS: Record<StatusKind, string> = {
  draft: 'Draft',
  pending: 'Pending',
  'under-review': 'Under review',
  approved: 'Approved',
  active: 'Active',
  rejected: 'Rejected',
  expired: 'Expired',
  suspended: 'Suspended',
  completed: 'Completed',
  cancelled: 'Cancelled',
};

export interface StatusBadgeProps extends Omit<BadgeProps, 'variant' | 'children'> {
  status: StatusKind;
  /** Pass translated text. Falls back to English. */
  label?: string;
}

export function StatusBadge({ status, label, dot = true, ...props }: StatusBadgeProps): ReactNode {
  return (
    <Badge variant={STATUS_VARIANTS[status]} dot={dot} {...props}>
      {label ?? DEFAULT_LABELS[status]}
    </Badge>
  );
}
