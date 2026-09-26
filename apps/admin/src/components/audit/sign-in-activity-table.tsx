'use client';

import { useLocale, useTranslations } from 'next-intl';
import { useMemo, useState, type ReactNode } from 'react';
import type { AuthActivityListItem, AuthActivityListQuery, Locale } from '@afaq/types';
import { Badge, Checkbox, createDataTableColumns, DataTable, TableToolbar } from '@afaq/ui';
import { formatDateTime } from '@afaq/utils';
import { useAuthActivity } from '@/lib/audit/use-audit';
import { useDataTableLabels, useTableToolbarLabels } from '@/lib/i18n/use-component-labels';

const column = createDataTableColumns<AuthActivityListItem>();

/**
 * Who tried to sign in, and whether it worked.
 *
 * The email is shown rather than a staff name because a failed attempt may
 * match no account at all — and those are exactly the rows worth reading.
 */
export function SignInActivityTable(): ReactNode {
  const t = useTranslations('audit.signIns');
  const locale = useLocale() as Locale;
  const tableLabels = useDataTableLabels();
  const toolbarLabels = useTableToolbarLabels();

  const [query, setQuery] = useState<AuthActivityListQuery>({ page: 1, pageSize: 25 });
  const [email, setEmail] = useState('');

  const { data, isPending, isError, refetch } = useAuthActivity({
    ...query,
    email: email || undefined,
  });

  const columns = useMemo(
    () => [
      column.accessor('occurredAt', {
        header: t('columns.when'),
        meta: { mobile: 'title' },
        cell: ({ getValue }) => (
          <span className="whitespace-nowrap">{formatDateTime(getValue(), { locale })}</span>
        ),
      }),
      column.accessor('email', { header: t('columns.email') }),
      column.accessor('event', {
        header: t('columns.event'),
        cell: ({ getValue }) => t(`events.${getValue()}`),
      }),
      column.accessor('succeeded', {
        header: t('columns.outcome'),
        cell: ({ getValue, row }) => (
          <Badge size="sm" variant={getValue() ? 'success' : 'danger'}>
            {getValue()
              ? t('succeeded')
              : // The stored reason is short and machine-shaped; showing it
                // beats "failed" with no explanation.
                (row.original.failureReason ?? t('failed'))}
          </Badge>
        ),
      }),
      column.accessor('deviceLabel', {
        header: t('columns.device'),
        cell: ({ getValue }) => getValue() ?? '—',
      }),
    ],
    [t, locale],
  );

  return (
    <div className="space-y-4">
      <TableToolbar
        {...toolbarLabels}
        search={email}
        onSearchChange={setEmail}
        searchPlaceholder={t('searchPlaceholder')}
        filters={
          <Checkbox
            label={t('failuresOnly')}
            checked={query.failuresOnly ?? false}
            onChange={(event) =>
              setQuery((current) => ({
                ...current,
                failuresOnly: event.target.checked || undefined,
                page: 1,
              }))
            }
          />
        }
      />

      <DataTable
        caption={t('title')}
        data={data?.items}
        columns={columns}
        getRowId={(entry) => entry.id}
        loading={isPending}
        error={isError ? t('loadError') : null}
        onRetry={() => void refetch()}
        search={email}
        onClearSearch={() => setEmail('')}
        empty={{ title: t('empty.title'), description: t('empty.description') }}
        labels={tableLabels}
        pageSize={query.pageSize ?? 25}
        pageSizeOptions={[25, 50, 100]}
        serverPagination={{
          page: query.page ?? 1,
          totalItems: data?.total ?? 0,
          onPageChange: (page) => setQuery((current) => ({ ...current, page })),
          onPageSizeChange: (pageSize) =>
            setQuery((current) => ({ ...current, pageSize, page: 1 })),
        }}
      />
    </div>
  );
}
