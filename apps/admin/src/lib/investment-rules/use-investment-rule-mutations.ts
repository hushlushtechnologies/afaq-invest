'use client';

import { useMutation, useQueryClient, type UseMutationResult } from '@tanstack/react-query';
import type { InvestmentMode, PayoutFrequency, RoiBasis, RuleSetScope } from '@afaq/types';
import { getApiClient } from '@/lib/api';
import { INVESTMENT_RULES_QUERY_KEY } from './use-investment-rules';

/**
 * Writing investment rules.
 *
 * Every one of these invalidates the whole key rather than patching a cache
 * entry. Publishing in particular changes three things at once — the new
 * ladder, the one it replaced, and whatever `active` resolves to — so
 * anything short of a refetch leaves some part of the screen lying.
 */

// ===========================================================================
// SETTINGS
// ===========================================================================

export interface UpdateInvestmentSettingsBody {
  currency?: string;
  minimumInvestment?: number;
  maxRoiPercent?: number;
  maxRoiBasis?: RoiBasis;
  defaultNoticePeriodDays?: number;
  requireStepUpToPublish?: boolean;
  /**
   * The administrator's own password. The API requires it only when turning
   * step-up off — a control that can be disabled without satisfying it is not
   * a control. Held for the length of the request and never stored.
   */
  password?: string;
}

export function useUpdateInvestmentSettings(): UseMutationResult<
  { id: string },
  Error,
  UpdateInvestmentSettingsBody
> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (body: UpdateInvestmentSettingsBody) =>
      getApiClient().patch<{ id: string }>('/investment-rules/settings', body),
    onSuccess: () => {
      // The cap and the minimum are what every ladder is judged against, so a
      // change here can make an existing draft invalid on screen.
      void queryClient.invalidateQueries({ queryKey: [INVESTMENT_RULES_QUERY_KEY] });
    },
  });
}

// ===========================================================================
// DRAFTS
// ===========================================================================

export interface CreateRuleSetBody {
  name: string;
  scope: RuleSetScope;
  companyId?: string | null;
  roiBasis: RoiBasis;
  notes?: string | null;
  /** Copy this rule set's tiers into the new draft. */
  fromRuleSetId?: string | null;
}

export function useCreateRuleSet(): UseMutationResult<{ id: string }, Error, CreateRuleSetBody> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (body: CreateRuleSetBody) =>
      getApiClient().post<{ id: string }>('/investment-rules', body),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: [INVESTMENT_RULES_QUERY_KEY] });
    },
  });
}

export interface UpdateRuleSetBody {
  name?: string;
  roiBasis?: RoiBasis;
  notes?: string | null;
}

export interface UpdateRuleSet extends UpdateRuleSetBody {
  id: string;
}

export function useUpdateRuleSet(): UseMutationResult<{ id: string }, Error, UpdateRuleSet> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, ...body }: UpdateRuleSet) =>
      getApiClient().patch<{ id: string }>(`/investment-rules/${id}`, body),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: [INVESTMENT_RULES_QUERY_KEY] });
    },
  });
}

// ===========================================================================
// THE LADDER
// ===========================================================================

/** One option as the editor sends it. Mirrors TierOptionDto on the API. */
export interface TierOptionBody {
  mode: InvestmentMode;
  roiPercent: number;
  payoutFrequency: PayoutFrequency;
  minTermMonths: number | null;
  maxTermMonths: number | null;
  noticePeriodDays: number;
  earnsDuringNotice: boolean;
}

export interface TierBody {
  name: string;
  minAmount: number;
  maxAmount: number | null;
  options: TierOptionBody[];
}

export interface ReplaceLadder {
  id: string;
  tiers: TierBody[];
}

/**
 * The whole ladder at once.
 *
 * Whole rather than tier by tier, matching the API: contiguity is a property
 * of the set, so a single tier is neither valid nor invalid on its own.
 */
export function useReplaceLadder(): UseMutationResult<
  { id: string; tierCount: number },
  Error,
  ReplaceLadder
> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, tiers }: ReplaceLadder) =>
      getApiClient().patch<{ id: string; tierCount: number }>(`/investment-rules/${id}/ladder`, {
        tiers,
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: [INVESTMENT_RULES_QUERY_KEY] });
    },
  });
}

// ===========================================================================
// LIFECYCLE
// ===========================================================================

export interface PublishRuleSet {
  id: string;
  /**
   * The administrator's own password, when step-up is switched on.
   *
   * Held only for the length of the request. It is never put in a query key,
   * never cached, and never written anywhere — which is why publishing is a
   * mutation taking it as an argument rather than anything stored in form
   * state that outlives the dialog.
   */
  password?: string;
  reason?: string;
}

export function usePublishRuleSet(): UseMutationResult<
  { id: string; version: number },
  Error,
  PublishRuleSet
> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, ...body }: PublishRuleSet) =>
      getApiClient().post<{ id: string; version: number }>(`/investment-rules/${id}/publish`, body),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: [INVESTMENT_RULES_QUERY_KEY] });
    },
  });
}

export interface ArchiveRuleSet {
  id: string;
  reason?: string;
}

export function useArchiveRuleSet(): UseMutationResult<{ id: string }, Error, ArchiveRuleSet> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, ...body }: ArchiveRuleSet) =>
      getApiClient().post<{ id: string }>(`/investment-rules/${id}/archive`, body),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: [INVESTMENT_RULES_QUERY_KEY] });
    },
  });
}

export function useDeleteRuleSet(): UseMutationResult<{ id: string }, Error, { id: string }> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id }: { id: string }) =>
      getApiClient().delete<{ id: string }>(`/investment-rules/${id}`),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: [INVESTMENT_RULES_QUERY_KEY] });
    },
  });
}
