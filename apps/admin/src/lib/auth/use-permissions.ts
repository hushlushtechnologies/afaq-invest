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
const NOBODY = { roleKeys: [], permissionKeys: [] };

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

  const staff = query.data ?? null;
  const context = staff ?? NOBODY;

  return {
    staff,
    loading: status === 'loading' || query.isPending,
    refusalReason: query.error instanceof ApiRequestError ? (query.error.reason ?? null) : null,
    can: (permission) => hasPermission(context, permission),
    canAny: (permissions) => hasAnyPermission(context, permissions),
    canAll: (permissions) => hasAllPermissions(context, permissions),
    isSuperAdmin: staff?.isSuperAdmin ?? false,
  };
}
