'use client';

import { useMutation, useQueryClient, type UseMutationResult } from '@tanstack/react-query';
import { getApiClient } from '@/lib/api';
import { ROLES_QUERY_KEY } from './use-roles';

export interface CreateRoleInput {
  name: string;
  description?: string;
  permissionKeys: string[];
}

export interface UpdateRoleInput extends Partial<CreateRoleInput> {
  id: string;
}

/**
 * Writing roles.
 *
 * Every one invalidates the whole roles key rather than a single entry: a
 * change to a role's permissions changes the counts on the list and the
 * detail of that role, and they must not disagree.
 */
export function useCreateRole(): UseMutationResult<{ id: string }, Error, CreateRoleInput> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (body: CreateRoleInput) => getApiClient().post<{ id: string }>('/roles', body),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [ROLES_QUERY_KEY] }),
  });
}

export function useUpdateRole(): UseMutationResult<{ id: string }, Error, UpdateRoleInput> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, ...body }: UpdateRoleInput) =>
      getApiClient().patch<{ id: string }>(`/roles/${id}`, body),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [ROLES_QUERY_KEY] }),
  });
}

export function useDeleteRole(): UseMutationResult<{ id: string }, Error, string> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => getApiClient().delete<{ id: string }>(`/roles/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [ROLES_QUERY_KEY] }),
  });
}
