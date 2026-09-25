'use client';

import { useQuery, type UseQueryResult } from '@tanstack/react-query';
import type { PermissionGroup, RoleDetail, RoleListItem } from '@afaq/types';
import { getApiClient } from '@/lib/api';

export const ROLES_QUERY_KEY = 'roles';

/**
 * The roles as they are actually stored.
 *
 * Read from the API rather than the SYSTEM_ROLES constant, because the two
 * can legitimately differ: custom roles are not in the constant at all, and a
 * system role's stored permissions lag its definition until the seed is run.
 * Screens that decide what somebody may do must reflect what is stored.
 */
export function useRoles(): UseQueryResult<RoleListItem[]> {
  return useQuery({
    queryKey: [ROLES_QUERY_KEY, 'list'],
    queryFn: () => getApiClient().get<RoleListItem[]>('/roles'),
    // Roles change rarely; refetching them on every screen is wasted work.
    staleTime: 5 * 60 * 1000,
  });
}

export function useRole(id: string | null): UseQueryResult<RoleDetail> {
  return useQuery({
    queryKey: [ROLES_QUERY_KEY, 'detail', id],
    queryFn: () => getApiClient().get<RoleDetail>(`/roles/${id}`),
    enabled: id !== null,
  });
}

/** The permission catalogue, grouped by what each permission acts on. */
export function usePermissionCatalogue(): UseQueryResult<PermissionGroup[]> {
  return useQuery({
    queryKey: [ROLES_QUERY_KEY, 'catalogue'],
    queryFn: () => getApiClient().get<PermissionGroup[]>('/permissions'),
    // The catalogue only changes when the code does.
    staleTime: Infinity,
  });
}
