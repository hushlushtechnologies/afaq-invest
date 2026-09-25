'use client';

import { useMutation, useQueryClient, type UseMutationResult } from '@tanstack/react-query';
import type { InviteStaffInput } from '@afaq/types';
import { getApiClient } from '@/lib/api';
import { STAFF_QUERY_KEY } from './use-staff-list';

/**
 * Invites a staff member and refreshes the directory.
 *
 * The list is invalidated rather than patched: the API decides the invitation
 * expiry and the exact record, and guessing them here would show something
 * subtly different from what was saved.
 */
export function useInviteStaff(): UseMutationResult<{ id: string }, Error, InviteStaffInput> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: InviteStaffInput) => getApiClient().post<{ id: string }>('/staff', input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [STAFF_QUERY_KEY] }),
  });
}
