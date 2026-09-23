'use client';

import { useTranslations } from 'next-intl';

import type { DataTableLabels, PaginationLabels, TableToolbarProps } from '@afaq/ui';

/**
 * Shared components in @afaq/ui carry English defaults because the package
 * cannot depend on any one app's translations.
 *
 * These hooks translate their labels so a page can pass:
 *
 * labels={useDataTableLabels()}
 *
 * and everything inside the table, including pagination, follows the locale.
 */

export function usePaginationLabels(): Partial<PaginationLabels> {
  const t = useTranslations('pagination');

  return {
    previous: t('previous'),
    next: t('next'),

    page: (page) =>
      t('page', {
        page,
      }),

    pageOf: (page, total) =>
      t('pageOf', {
        page,
        total,
      }),

    showing: (from, to, total) =>
      t('showing', {
        from,
        to,
        total,
      }),
  };
}

export function useDataTableLabels(): Partial<DataTableLabels> {
  const t = useTranslations('table');
  const actions = useTranslations('actions');

  const pagination = usePaginationLabels();

  return {
    selectAll: t('selectAll'),
    selectRow: t('selectRow'),
    loading: t('loading'),
    errorTitle: t('errorTitle'),

    retry: actions('retry'),

    noResultsTitle: t('noResultsTitle'),

    noResultsDescription: (search) =>
      t('noResultsDescription', {
        search,
      }),

    clearSearch: t('clearSearch'),
    rowsPerPage: t('rowsPerPage'),

    pagination,
  };
}

type ToolbarLabels = Pick<
  TableToolbarProps,
  'searchPlaceholder' | 'searchLabel' | 'selectedLabel' | 'clearSelectionLabel'
>;

export function useTableToolbarLabels(): ToolbarLabels {
  const t = useTranslations('table');

  return {
    searchPlaceholder: t('searchPlaceholder'),
    searchLabel: t('searchLabel'),

    selectedLabel: (count) =>
      t('selected', {
        count,
      }),

    clearSelectionLabel: t('clearSelection'),
  };
}
