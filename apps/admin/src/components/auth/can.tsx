'use client';

import type { ReactNode } from 'react';
import type { PermissionKey } from '@afaq/types';
import { usePermissions } from '@/lib/auth/use-permissions';

export interface CanProps {
  /** Shown when the staff member holds this permission. */
  permission?: PermissionKey;
  /** Or holds at least one of these. */
  anyOf?: readonly PermissionKey[];
  /** Or holds all of these. */
  allOf?: readonly PermissionKey[];
  children: ReactNode;
  /** Shown instead when they do not. Usually nothing at all. */
  fallback?: ReactNode;
}

/**
 * Shows its children only to staff who are allowed the action.
 *
 * Hides rather than disables: a button that exists but refuses invites people
 * to wonder what they are missing. Disabled belongs to controls that are
 * temporarily unavailable, not permanently forbidden.
 *
 * Appearance only — the API decides.
 */
export function Can({ permission, anyOf, allOf, children, fallback = null }: CanProps): ReactNode {
  const { can, canAny, canAll, loading } = usePermissions();

  // Show nothing until the answer arrives, rather than flashing a control
  // that is about to disappear.
  if (loading) return fallback;

  const allowed =
    (permission ? can(permission) : true) &&
    (anyOf ? canAny(anyOf) : true) &&
    (allOf ? canAll(allOf) : true);

  return allowed ? children : fallback;
}
