'use client';

import { useMutation, useQueryClient, type UseMutationResult } from '@tanstack/react-query';
import type { OpportunityInput, OpportunityMove } from '@afaq/types';
import { getApiClient } from '@/lib/api';
import { OPPORTUNITIES_QUERY_KEY } from './use-opportunities';

/**
 * Every write below invalidates the whole opportunities key rather than
 * patching one entry: the list, the counts, the detail page and the panel on
 * the company's own page all change, and all of them read through this key.
 */
function useInvalidateOpportunities(): () => void {
  const queryClient = useQueryClient();
  return () => {
    void queryClient.invalidateQueries({ queryKey: [OPPORTUNITIES_QUERY_KEY] });
  };
}

/** Drafting an opportunity. */
export function useCreateOpportunity(): UseMutationResult<{ id: string }, Error, OpportunityInput> {
  const invalidate = useInvalidateOpportunities();

  return useMutation({
    mutationFn: (body: OpportunityInput) =>
      getApiClient().post<{ id: string }>('/opportunities', body),
    onSuccess: invalidate,
  });
}

/**
 * Only the fields that changed. Sending the whole form would make every save
 * look like an edit to every field in the audit trail — and the API refuses
 * a save that changes nothing, so the form sends nothing in that case.
 */
export type OpportunityChanges = Partial<OpportunityInput>;

export interface UpdateOpportunity {
  id: string;
  changes: OpportunityChanges;
}

export function useUpdateOpportunity(): UseMutationResult<
  { id: string },
  Error,
  UpdateOpportunity
> {
  const invalidate = useInvalidateOpportunities();

  return useMutation({
    mutationFn: ({ id, changes }: UpdateOpportunity) =>
      getApiClient().patch<{ id: string }>(`/opportunities/${encodeURIComponent(id)}`, changes),
    // On a refusal too: the usual cause is that somebody else changed the
    // raise first, and the screen should show what they changed it to.
    onSettled: invalidate,
  });
}

export interface MoveOpportunity {
  id: string;
  move: OpportunityMove;
  /** Required by the API for suspend and cancel; an optional note otherwise. */
  reason?: string;
}

/**
 * Opening, suspending, resuming, closing or cancelling.
 *
 * One hook for all five because they share a shape — a POST to
 * `/opportunities/:id/<move>` with an optional reason — and the dialog that
 * drives them is one component. Each still lands on its own audited endpoint.
 */
export function useMoveOpportunity(): UseMutationResult<{ id: string }, Error, MoveOpportunity> {
  const invalidate = useInvalidateOpportunities();

  return useMutation({
    mutationFn: ({ id, move, reason }: MoveOpportunity) =>
      getApiClient().post<{ id: string }>(
        `/opportunities/${encodeURIComponent(id)}/${move}`,
        reason ? { reason } : {},
      ),
    // On a refusal too, for the same reason as an edit: a move refused as
    // "not possible from this status" means the status on screen is stale.
    onSettled: invalidate,
  });
}

/** Discarding a draft. Anything that has opened can only be cancelled. */
export function useDeleteOpportunity(): UseMutationResult<{ id: string }, Error, { id: string }> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id }: { id: string }) =>
      getApiClient().delete<{ id: string }>(`/opportunities/${encodeURIComponent(id)}`),
    onSuccess: (_result, { id }) => {
      // The deleted draft's own entry is dropped rather than refetched: a
      // refetch would only come back 404 and flash the "not found" page on
      // the way out.
      queryClient.removeQueries({ queryKey: [OPPORTUNITIES_QUERY_KEY, 'detail', id] });
      void queryClient.invalidateQueries({ queryKey: [OPPORTUNITIES_QUERY_KEY] });
    },
  });
}
