'use client';

import { useMutation, useQueryClient, type UseMutationResult } from '@tanstack/react-query';

import type { StaffStatus } from '@afaq/types';

import { getApiClient } from '@/lib/api';

import { STAFF_QUERY_KEY } from './use-staff-list';

export interface UpdateStaffDetails {
  id: string;
  fullName?: string;
  jobTitle?: string;
  preferredLocale?: string;
}

export interface UpdateStaffRoles {
  id: string;
  roleKeys: string[];
}

export interface UpdateStaffStatus {
  id: string;
  status: Extract<StaffStatus, 'ACTIVE' | 'SUSPENDED' | 'DISABLED'>;
  reason?: string;
}

/**
 * Update a staff member's basic details.
 *
 * The staff list is invalidated after a successful update
 * so the UI always receives the latest server state.
 */
export function useUpdateStaffDetails(): UseMutationResult<
  { id: string },
  Error,
  UpdateStaffDetails
> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, ...body }: UpdateStaffDetails) =>
      getApiClient().patch<{ id: string }>(`/staff/${id}`, body),

    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: [STAFF_QUERY_KEY],
      });
    },
  });
}

/**
 * Update a staff member's roles.
 *
 * The staff list is invalidated after a successful update
 * so role-related changes are reflected from the server.
 */
export function useUpdateStaffRoles(): UseMutationResult<{ id: string }, Error, UpdateStaffRoles> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, roleKeys }: UpdateStaffRoles) =>
      getApiClient().patch<{ id: string }>(`/staff/${id}/roles`, { roleKeys }),

    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: [STAFF_QUERY_KEY],
      });
    },
  });
}

/**
 * Update a staff member's status.
 *
 * The staff list is invalidated after a successful update
 * because status changes can affect which records are returned
 * by the API.
 */
export function useUpdateStaffStatus(): UseMutationResult<
  { id: string },
  Error,
  UpdateStaffStatus
> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, ...body }: UpdateStaffStatus) =>
      getApiClient().patch<{ id: string }>(`/staff/${id}/status`, body),

    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: [STAFF_QUERY_KEY],
      });
    },
  });
}
