'use client';

import { useMutation, useQueryClient, type UseMutationResult } from '@tanstack/react-query';

import type { CompanyInput, CompanyStatus } from '@afaq/types';

import { getApiClient } from '@/lib/api';

import { COMPANIES_QUERY_KEY } from './use-companies';

export interface ChangeCompanyStatus {
  id: string;
  status: CompanyStatus;
  reason?: string;
}

export interface SetCompanyFeatured {
  id: string;
  isFeatured: boolean;
}

/**
 * Everything an edit may change. Type, status and featuring have their own
 * calls.
 *
 * Written out rather than derived from CompanyInput with Pick: the nullable
 * fields differ, and a derived type makes `name` required here when a partial
 * edit may well leave it alone.
 */
export interface UpdateCompanyBody {
  name?: string;
  legalName?: string | null;
  sector?: string;
  description?: string | null;
  logoUrl?: string | null;
  coverImageUrl?: string | null;
  website?: string | null;
  contactEmail?: string | null;
  contactPhone?: string | null;
}

export interface UpdateCompany extends UpdateCompanyBody {
  id: string;
}

/**
 * Adding a company.
 *
 * The whole companies key is invalidated rather than one page appended to:
 * a new company lands wherever its order and featured flag put it.
 */
export function useCreateCompany(): UseMutationResult<{ id: string }, Error, CompanyInput> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (body: CompanyInput) => getApiClient().post<{ id: string }>('/companies', body),

    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: [COMPANIES_QUERY_KEY],
      });
    },
  });
}

/**
 * Editing a company's details.
 */
export function useUpdateCompany(): UseMutationResult<{ id: string }, Error, UpdateCompany> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, ...body }: UpdateCompany) =>
      getApiClient().patch<{ id: string }>(`/companies/${id}`, body),

    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: [COMPANIES_QUERY_KEY],
      });
    },
  });
}

/**
 * Activating, deactivating or suspending a company.
 */
export function useChangeCompanyStatus(): UseMutationResult<
  { id: string },
  Error,
  ChangeCompanyStatus
> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, ...body }: ChangeCompanyStatus) =>
      getApiClient().patch<{ id: string }>(`/companies/${id}/status`, body),

    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: [COMPANIES_QUERY_KEY],
      });
    },
  });
}

/**
 * Promoting or demoting a company in the marketplace.
 */
export function useSetCompanyFeatured(): UseMutationResult<
  { id: string },
  Error,
  SetCompanyFeatured
> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, isFeatured }: SetCompanyFeatured) =>
      getApiClient().patch<{ id: string }>(`/companies/${id}/featured`, { isFeatured }),

    onSuccess: () => {
      // Featuring changes the default ordering, so the list is re-fetched
      // rather than patched in place.
      void queryClient.invalidateQueries({
        queryKey: [COMPANIES_QUERY_KEY],
      });
    },
  });
}
