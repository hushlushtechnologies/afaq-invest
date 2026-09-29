'use client';

import { keepPreviousData, useQuery, type UseQueryResult } from '@tanstack/react-query';
import type {
  InvestmentQuote,
  InvestmentSettings,
  Paginated,
  ResolvedInvestmentTerms,
  RuleSetDetail,
  RuleSetListItem,
  RuleSetScope,
  RuleSetStatus,
} from '@afaq/types';
import { getApiClient } from '@/lib/api';

export const INVESTMENT_RULES_QUERY_KEY = 'investment-rules';

/** What the rule-set list can be narrowed by. */
export interface RuleSetListQuery {
  page?: number;
  pageSize?: number;
  scope?: RuleSetScope;
  status?: RuleSetStatus;
  companyId?: string;
}

/**
 * Turns a query into a search string, leaving out anything unset.
 *
 * Takes `object` rather than `Record<string, unknown>`: an interface has no
 * implicit index signature, so the typed query shapes below would each need a
 * cast to satisfy the stricter type — and a cast at every call site is a
 * lot of noise to buy nothing.
 */
function toSearchParams(query: object): string {
  const params = new URLSearchParams();

  for (const [key, value] of Object.entries(query)) {
    if (value === undefined || value === null || value === '') continue;
    params.set(key, String(value));
  }

  const search = params.toString();
  return search ? `?${search}` : '';
}

/**
 * The platform-wide settings.
 *
 * Cached for a while: the minimum, the cap and the currency change rarely, and
 * every screen that shows a ladder needs them to make sense of it.
 */
export function useInvestmentSettings(): UseQueryResult<InvestmentSettings> {
  return useQuery({
    queryKey: [INVESTMENT_RULES_QUERY_KEY, 'settings'],
    queryFn: () => getApiClient().get<InvestmentSettings>('/investment-rules/settings'),
    staleTime: 5 * 60_000,
  });
}

/**
 * A page of rule sets.
 *
 * `keepPreviousData` so changing a filter does not empty the table for a beat
 * and make the layout jump.
 */
export function useRuleSetList(
  query: RuleSetListQuery,
): UseQueryResult<Paginated<RuleSetListItem>> {
  return useQuery({
    queryKey: [INVESTMENT_RULES_QUERY_KEY, 'list', query],
    queryFn: () =>
      getApiClient().get<Paginated<RuleSetListItem>>(`/investment-rules${toSearchParams(query)}`),
    placeholderData: keepPreviousData,
  });
}

/**
 * One rule set, with its whole ladder.
 *
 * Guarded rather than trusted: the id comes from the route, and a page placed
 * in a folder with no [id] segment hands over `undefined` while the types
 * still look fine. A blank id should reach the "no such rule set" state, not
 * throw before anything has rendered.
 */
export function useRuleSet(id: string | undefined): UseQueryResult<RuleSetDetail> {
  const wanted = typeof id === 'string' ? id.trim() : '';

  return useQuery({
    queryKey: [INVESTMENT_RULES_QUERY_KEY, 'detail', wanted],
    queryFn: () =>
      getApiClient().get<RuleSetDetail>(`/investment-rules/${encodeURIComponent(wanted)}`),
    enabled: wanted.length > 0,
  });
}

/**
 * The ladder in force right now.
 *
 * With a company, its own live ladder when it has one and the platform-wide
 * one otherwise — the API decides which, so no screen has to know the rule.
 */
export function useActiveRuleSet(companyId?: string): UseQueryResult<RuleSetDetail> {
  return useQuery({
    queryKey: [INVESTMENT_RULES_QUERY_KEY, 'active', companyId ?? null],
    queryFn: () =>
      getApiClient().get<RuleSetDetail>(`/investment-rules/active${toSearchParams({ companyId })}`),
    // A 409 here means nothing is published, which is a real state the screen
    // shows rather than an error to retry into.
    retry: false,
  });
}

/** What an amount falls under. */
export interface ResolveQuery {
  amount: number;
  mode: 'LOCKED' | 'UNLOCKED';
  companyId?: string;
  termMonths?: number;
}

/**
 * What an amount would earn.
 *
 * Asked of the API rather than worked out here, deliberately: the browser must
 * never be a second opinion on what the business owes somebody. `enabled`
 * keeps it quiet until there is an amount worth asking about.
 */
export function useInvestmentQuote(query: ResolveQuery | null): UseQueryResult<InvestmentQuote> {
  return useQuery({
    queryKey: [INVESTMENT_RULES_QUERY_KEY, 'quote', query],
    queryFn: () => {
      // `enabled` below keeps this from running without a query, but
      // TypeScript cannot see that. Throwing beats asking the API to price
      // nothing and rendering whatever comes back.
      if (!query) throw new Error('No amount to quote.');

      return getApiClient().get<InvestmentQuote>(`/investment-rules/quote${toSearchParams(query)}`);
    },
    enabled: query !== null && query.amount > 0,
    retry: false,
    placeholderData: keepPreviousData,
  });
}

/** The tier and terms alone, without the money. */
export function useResolvedTerms(
  query: ResolveQuery | null,
): UseQueryResult<ResolvedInvestmentTerms> {
  return useQuery({
    queryKey: [INVESTMENT_RULES_QUERY_KEY, 'resolve', query],
    queryFn: () => {
      if (!query) throw new Error('No amount to resolve.');

      return getApiClient().get<ResolvedInvestmentTerms>(
        `/investment-rules/resolve${toSearchParams(query)}`,
      );
    },
    enabled: query !== null && query.amount > 0,
    retry: false,
  });
}
