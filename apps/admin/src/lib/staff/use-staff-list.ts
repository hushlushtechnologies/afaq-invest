'use client';

import { keepPreviousData, useQuery, type UseQueryResult } from '@tanstack/react-query';
import type { Paginated, StaffListItem, StaffListQuery } from '@afaq/types';
import { getApiClient } from '@/lib/api';

export const STAFF_QUERY_KEY = 'staff';

/** Turns the query into a search string, leaving out anything unset. */
function toSearchParams(query: StaffListQuery): string {
  const params = new URLSearchParams();

  for (const [key, value] of Object.entries(query)) {
    if (value === undefined || value === null || value === '') continue;
    params.set(key, String(value));
  }

  const search = params.toString();
  return search ? `?${search}` : '';
}

/**
 * A page of the staff directory.
 *
 * `keepPreviousData` matters here: without it, changing page or typing in the
 * search box empties the table for a moment and the layout jumps. With it the
 * previous rows stay in place, dimmed, until the new ones arrive.
 */
export function useStaffList(query: StaffListQuery): UseQueryResult<Paginated<StaffListItem>> {
  return useQuery({
    queryKey: [STAFF_QUERY_KEY, 'list', query],
    queryFn: () => getApiClient().get<Paginated<StaffListItem>>(`/staff${toSearchParams(query)}`),
    placeholderData: keepPreviousData,
  });
}
