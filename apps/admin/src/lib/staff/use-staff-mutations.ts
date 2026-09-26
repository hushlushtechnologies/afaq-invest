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

export function useResetStaffPassword(): UseMutationResult<
  { temporaryPassword: string },
  Error,
  string
> {
  return useMutation({
    mutationFn: (id: string) =>
      getApiClient().post<{ temporaryPassword: string }>(`/staff/${id}/password`, {}),
    gcTime: 0,
  });
}

export function useChangeStaffEmail(): UseMutationResult<
  { id: string },
  Error,
  { id: string; email: string }
> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, email }: { id: string; email: string }) =>
      getApiClient().patch<{ id: string }>(`/staff/${id}/email`, {
        email,
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: [STAFF_QUERY_KEY],
      });
    },
  });
}

export function useTransferRoles(): UseMutationResult<
  { id: string },
  Error,
  { id: string; toStaffUserId: string; removeFromSource: boolean }
> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      toStaffUserId,
      removeFromSource,
    }: {
      id: string;
      toStaffUserId: string;
      removeFromSource: boolean;
    }) =>
      getApiClient().post<{ id: string }>(`/staff/${id}/transfer-roles`, {
        toStaffUserId,
        removeFromSource,
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: [STAFF_QUERY_KEY],
      });
    },
  });
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
      getApiClient().patch<{ id: string }>(`/staff/${id}/roles`, {
        roleKeys,
      }),

    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: [STAFF_QUERY_KEY],
      });
    },
  });
}

/**
 * Sends an invitation again and restarts its seven-day clock.
 */
export function useResendInvitation(): UseMutationResult<{ id: string }, Error, string> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) =>
      getApiClient().post<{ id: string }>(`/staff/${id}/resend-invitation`, {}),

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
