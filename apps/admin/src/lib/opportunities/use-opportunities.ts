'use client';

import { keepPreviousData, useQuery, type UseQueryResult } from '@tanstack/react-query';
import type {
  OpportunityDetail,
  OpportunityListItem,
  OpportunityListQuery,
  OpportunitySummary,
  Paginated,
} from '@afaq/types';
import { getApiClient } from '@/lib/api';

export const OPPORTUNITIES_QUERY_KEY = 'opportunities';

/**
 * Turns a query into a search string, leaving out anything unset.
 *
 * `false` is left out along with the empty values: "live only: false" means
 * "no filter", and sending it would ask the API for something nobody chose.
 */
function toSearchParams(query: object): string {
  const params = new URLSearchParams();

  for (const [key, value] of Object.entries(query)) {
    if (value === undefined || value === null || value === '' || value === false) continue;
    params.set(key, String(value));
  }

  const search = params.toString();
  return search ? `?${search}` : '';
}

/**
 * A page of opportunities.
 *
 * `keepPreviousData` so changing a filter or typing in the search box does not
 * empty the table for a beat and make the layout jump.
 */
export function useOpportunityList(
  query: OpportunityListQuery,
): UseQueryResult<Paginated<OpportunityListItem>> {
  return useQuery({
    queryKey: [OPPORTUNITIES_QUERY_KEY, 'list', query],
    queryFn: () =>
      getApiClient().get<Paginated<OpportunityListItem>>(`/opportunities${toSearchParams(query)}`),
    placeholderData: keepPreviousData,
  });
}

/**
 * One opportunity, with its pinned terms once it has opened.
 *
 * Guarded rather than trusted: the id comes from the route, and a blank one
 * should reach the "no such opportunity" state rather than ask the API for
 * `/opportunities/` and render whatever comes back.
 */
export function useOpportunity(id: string | undefined): UseQueryResult<OpportunityDetail> {
  const wanted = typeof id === 'string' ? id.trim() : '';

  return useQuery({
    queryKey: [OPPORTUNITIES_QUERY_KEY, 'detail', wanted],
    queryFn: () =>
      getApiClient().get<OpportunityDetail>(`/opportunities/${encodeURIComponent(wanted)}`),
    enabled: wanted.length > 0,
  });
}

/** The counts and open totals for the top of the page. */
export function useOpportunitySummary(): UseQueryResult<OpportunitySummary> {
  return useQuery({
    queryKey: [OPPORTUNITIES_QUERY_KEY, 'summary'],
    queryFn: () => getApiClient().get<OpportunitySummary>('/opportunities/summary'),
  });
}
