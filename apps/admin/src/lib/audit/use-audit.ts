'use client';

import { keepPreviousData, useQuery, type UseQueryResult } from '@tanstack/react-query';
import type {
  AuditListQuery,
  AuditLogListItem,
  AuthActivityListItem,
  AuthActivityListQuery,
  Paginated,
} from '@afaq/types';
import { getApiClient } from '@/lib/api';

export const AUDIT_QUERY_KEY = 'audit';

function toSearchParams(query: AuditListQuery | AuthActivityListQuery): string {
  const params = new URLSearchParams();

  for (const [key, value] of Object.entries(query) as Array<[string, unknown]>) {
    if (value === undefined || value === '' || value === false) continue;
    params.set(key, String(value));
  }

  return params.toString();
}

/**
 * A page of the audit trail.
 *
 * Previous results are kept while the next page loads: the trail is read by
 * paging through it, and a table that empties between pages makes that
 * unpleasant.
 */
export function useAuditLog(query: AuditListQuery): UseQueryResult<Paginated<AuditLogListItem>> {
  return useQuery({
    queryKey: [AUDIT_QUERY_KEY, 'log', query],
    queryFn: () =>
      getApiClient().get<Paginated<AuditLogListItem>>(`/audit?${toSearchParams(query)}`),
    placeholderData: keepPreviousData,
  });
}

/** Sign-in activity, including attempts that failed. */
export function useAuthActivity(
  query: AuthActivityListQuery,
): UseQueryResult<Paginated<AuthActivityListItem>> {
  return useQuery({
    queryKey: [AUDIT_QUERY_KEY, 'sign-ins', query],
    queryFn: () =>
      getApiClient().get<Paginated<AuthActivityListItem>>(
        `/audit/sign-ins?${toSearchParams(query)}`,
      ),
    placeholderData: keepPreviousData,
  });
}

/** Everything that ever happened to one record. */
export function useRecordHistory(
  targetType: string,
  targetId: string | null,
): UseQueryResult<Paginated<AuditLogListItem>> {
  return useQuery({
    queryKey: [AUDIT_QUERY_KEY, 'history', targetType, targetId],
    queryFn: () =>
      getApiClient().get<Paginated<AuditLogListItem>>(`/audit/${targetType}/${targetId}`),
    enabled: targetId !== null,
  });
}
