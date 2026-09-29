'use client';

import { keepPreviousData, useQuery, type UseQueryResult } from '@tanstack/react-query';
import type {
  CompanyDetail,
  CompanyListItem,
  CompanyListQuery,
  CompanySummary,
  Paginated,
} from '@afaq/types';
import { getApiClient } from '@/lib/api';

export const COMPANIES_QUERY_KEY = 'companies';

/** Turns the query into a search string, leaving out anything unset. */
function toSearchParams(query: CompanyListQuery): string {
  const params = new URLSearchParams();

  for (const [key, value] of Object.entries(query)) {
    if (value === undefined || value === null || value === '') continue;
    params.set(key, String(value));
  }

  const search = params.toString();
  return search ? `?${search}` : '';
}

/**
 * A page of companies.
 *
 * `keepPreviousData` matters: without it, changing page or typing in the search
 * box empties the table for a moment and the layout jumps. With it the previous
 * rows stay in place, dimmed, until the new ones arrive.
 */
export function useCompanyList(
  query: CompanyListQuery,
): UseQueryResult<Paginated<CompanyListItem>> {
  return useQuery({
    queryKey: [COMPANIES_QUERY_KEY, 'list', query],
    queryFn: () =>
      getApiClient().get<Paginated<CompanyListItem>>(`/companies${toSearchParams(query)}`),
    placeholderData: keepPreviousData,
  });
}

/**
 * One company, by the slug in the address.
 *
 * By slug rather than id because the slug is what is in the address bar, and it
 * never changes once created — so a link somebody saved or sent a colleague
 * keeps working even after the company is renamed.
 */
export function useCompanyBySlug(slug: string | undefined): UseQueryResult<CompanyDetail> {
  // Guarded rather than trusted. TypeScript says this is a string, but the
  // value comes from the route: put this page's code in a folder with no
  // [slug] segment and `params.slug` is undefined at runtime while the types
  // still look fine. A blank slug should reach the "no such company" state,
  // not throw before the component has rendered anything.
  const wanted = typeof slug === 'string' ? slug.trim() : '';

  return useQuery({
    queryKey: [COMPANIES_QUERY_KEY, 'detail', wanted],
    queryFn: () =>
      getApiClient().get<CompanyDetail>(`/companies/by-slug/${encodeURIComponent(wanted)}`),
    enabled: wanted.length > 0,
  });
}

/**
 * The sectors currently in use, for the list's filter.
 *
 * Read from the companies themselves rather than a fixed list, so a sector an
 * administrator invents appears in the filter without a deployment. Cached for
 * longer than the list: sectors change far less often than companies do.
 */
export function useCompanySectors(): UseQueryResult<string[]> {
  return useQuery({
    queryKey: [COMPANIES_QUERY_KEY, 'sectors'],
    queryFn: () => getApiClient().get<string[]>('/companies/sectors'),
    staleTime: 5 * 60_000,
  });
}

/** The company counts, for the dashboard in a later phase. */
export function useCompanySummary(): UseQueryResult<CompanySummary> {
  return useQuery({
    queryKey: [COMPANIES_QUERY_KEY, 'summary'],
    queryFn: () => getApiClient().get<CompanySummary>('/companies/summary'),
    staleTime: 60_000,
  });
}
