'use client';

import { useQuery } from '@tanstack/react-query';
import {
  hasAllPermissions,
  hasAnyPermission,
  hasPermission,
  type PermissionKey,
  type StaffContextDto,
} from '@afaq/types';
import { ApiRequestError } from '@afaq/api-client';
import { useAuth } from './auth-context';
import { getApiClient } from '@/lib/api';

export const STAFF_CONTEXT_QUERY_KEY = ['auth', 'me'] as const;

export interface PermissionState {
  staff: StaffContextDto | null;
  loading: boolean;
  /** Set when the API refused us — e.g. "suspended", "not_staff". */
  refusalReason: string | null;
  can: (permission: PermissionKey) => boolean;
  canAny: (permissions: readonly PermissionKey[]) => boolean;
  canAll: (permissions: readonly PermissionKey[]) => boolean;
  isSuperAdmin: boolean;
}

/** Nothing is permitted until the answer arrives — never the other way round. */
/** Nothing is permitted until the answer arrives — never the other way round. */
const NOBODY = { roleKeys: [], permissionKeys: [] };

/**
 * Makes a usable context out of whatever the API actually returned.
 *
 * This is the point where untrusted data enters the browser. A response that
 * is the wrong shape — an error page, a proxy's JSON, a truncated body —
 * would otherwise reach the permission helpers and throw on a missing array,
 * taking the page down. Denying is the right answer to "I cannot tell what
 * you are allowed to do"; crashing is not.
 */
function toContext(staff: StaffContextDto | null): {
  roleKeys: string[];
  permissionKeys: PermissionKey[];
} {
  if (!staff || !Array.isArray(staff.roleKeys) || !Array.isArray(staff.permissionKeys)) {
    return NOBODY;
  }

  return { roleKeys: staff.roleKeys, permissionKeys: staff.permissionKeys };
}
/**
 * What the signed-in staff member may do.
 *
 * Asked of the API once and cached, then used to decide what to show. The
 * decision itself is made by the same function the API uses, so the interface
 * and the server can never disagree about what a permission means.
 *
 * This is for appearances only. Hiding a button stops nobody determined; the
 * API refuses the request regardless.
 */
export function usePermissions(): PermissionState {
  const { status } = useAuth();

  const query = useQuery({
    queryKey: STAFF_CONTEXT_QUERY_KEY,
    queryFn: () => getApiClient().get<StaffContextDto>('/auth/me'),
    // Pointless to ask before there is a session to ask with.
    enabled: status === 'authenticated',
    staleTime: 5 * 60_000,
  });

  const raw = query.data ?? null;
  const context = toContext(raw);
  // Only a well-formed answer counts as a staff member; a malformed one is
  // treated as nobody, consistently with the permissions above.
  const staff = context === NOBODY ? null : raw;

  return {
    staff,
    // Already knowing the answer beats knowing whose answer it is: with the
    // context seeded from the server there is nothing to wait for, and making
    // the nav wait for the session to resolve would put the skeletons back.
    loading: staff === null && (status === 'loading' || query.isPending),
    refusalReason: query.error instanceof ApiRequestError ? (query.error.reason ?? null) : null,
    can: (permission) => hasPermission(context, permission),
    canAny: (permissions) => hasAnyPermission(context, permissions),
    canAll: (permissions) => hasAllPermissions(context, permissions),
    isSuperAdmin: staff?.isSuperAdmin ?? false,
  };
}
