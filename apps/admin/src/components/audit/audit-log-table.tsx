'use client';

import { useLocale, useTranslations } from 'next-intl';
import { useMemo, useState, type ReactNode } from 'react';
import {
  AUDIT_CATEGORIES,
  type AuditCategory,
  type AuditListQuery,
  type AuditLogListItem,
  type Locale,
} from '@afaq/types';
import {
  Badge,
  createDataTableColumns,
  DataTable,
  FilterBar,
  TableToolbar,
  type ActiveFilter,
  type BadgeVariant,
} from '@afaq/ui';
import { formatDateTime } from '@afaq/utils';
import { useAuditLog } from '@/lib/audit/use-audit';
import { useDataTableLabels, useTableToolbarLabels } from '@/lib/i18n/use-component-labels';
import { useActionLabel } from './audit-action-label';
import { AuditEntryDrawer } from './audit-entry-drawer';

const column = createDataTableColumns<AuditLogListItem>();

/**
 * Which colour each category carries, so the eye can skip to what it wants.
 *
 * Typed by AuditCategory rather than by string, so adding a category to the
 * shared list and forgetting it here is a compile error instead of a silently
 * grey badge. SECURITY is the only red: a refused step-up or a disabled
 * control is the thing somebody scanning this list is hunting for.
 * INVESTMENT_RULE carries the brand tint because it is the only area where a
 * change alters what investors are being sold.
 */
const CATEGORY_TONE: Record<AuditCategory, BadgeVariant> = {
  AUTH: 'neutral',
  STAFF: 'info',
  ROLE: 'info',
  PERMISSION: 'warning',
  SECURITY: 'danger',
  SETTINGS: 'neutral',
  COMPANY: 'info',
  INVESTMENT_RULE: 'primary',
};

/**
 * The audit trail.
 *
 * Read newest-first and paged by the server, because this is the one table in
 * the system with no upper bound on its size.
 */
export function AuditLogTable(): ReactNode {
  const t = useTranslations('audit');
  const locale = useLocale() as Locale;
  const tableLabels = useDataTableLabels();
  const toolbarLabels = useTableToolbarLabels();
  const actionLabel = useActionLabel();

  const [query, setQuery] = useState<AuditListQuery>({ page: 1, pageSize: 25 });
  const [search, setSearch] = useState('');
  const [viewing, setViewing] = useState<AuditLogListItem | null>(null);

  const { data, isPending, isError, refetch } = useAuditLog({
    ...query,
    search: search || undefined,
  });

  /** Any change other than paging returns to the first page. */
  function narrow(changes: Partial<AuditListQuery>): void {
    setQuery((current) => ({ ...current, ...changes, page: 1 }));
  }

  const columns = useMemo(
    () => [
      column.accessor('occurredAt', {
        header: t('columns.when'),
        meta: { mobile: 'title' },
        cell: ({ getValue }) => (
          <span className="whitespace-nowrap">{formatDateTime(getValue(), { locale })}</span>
        ),
      }),
      column.accessor('action', {
        header: t('columns.action'),
        cell: ({ getValue }) => {
          const label = actionLabel(getValue());

          // An action this build has no wording for is shown in the monospace
          // face, so it reads as a stored identifier rather than as a sentence
          // somebody wrote badly.
          return (
            <span className={label.known ? 'text-fg' : 'font-mono text-caption text-fg-secondary'}>
              {label.text}
            </span>
          );
        },
      }),
      column.accessor('category', {
        header: t('columns.category'),
        cell: ({ getValue }) => (
          <Badge size="sm" variant={CATEGORY_TONE[getValue()] ?? 'neutral'}>
            {t(`categories.${getValue()}`)}
          </Badge>
        ),
      }),
      column.accessor('actorEmail', { header: t('columns.actor') }),
      column.accessor('targetLabel', {
        header: t('columns.target'),
        cell: ({ getValue, row }) => getValue() ?? row.original.targetType ?? '—',
      }),
    ],
    [t, locale, actionLabel],
  );

  const chips: ActiveFilter[] = [
    ...(query.category
      ? [
          {
            id: 'category',
            label: t('filters.category'),
            value: t(`categories.${query.category}`),
          },
        ]
      : []),
    ...(query.from ? [{ id: 'from', label: t('filters.from'), value: query.from }] : []),
    ...(query.to ? [{ id: 'to', label: t('filters.to'), value: query.to }] : []),
  ];

  return (
    <div className="space-y-4">
      <TableToolbar
        {...toolbarLabels}
        search={search}
        onSearchChange={setSearch}
        searchPlaceholder={t('searchPlaceholder')}
        filters={
          <>
            <select
              aria-label={t('filters.category')}
              value={query.category ?? ''}
              onChange={(event) =>
                narrow({
                  category: (event.target.value || undefined) as AuditListQuery['category'],
                })
              }
              className="h-8 rounded-lg border border-border bg-surface px-2.5 text-body-small text-fg-secondary outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <option value="">{t('filters.allCategories')}</option>
              {AUDIT_CATEGORIES.map((category) => (
                <option key={category} value={category}>
                  {t(`categories.${category}`)}
                </option>
              ))}
            </select>

            <input
              type="date"
              aria-label={t('filters.from')}
              value={query.from ?? ''}
              onChange={(event) => narrow({ from: event.target.value || undefined })}
              className="h-8 rounded-lg border border-border bg-surface px-2.5 text-body-small text-fg-secondary outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />

            <input
              type="date"
              aria-label={t('filters.to')}
              value={query.to ?? ''}
              onChange={(event) => narrow({ to: event.target.value || undefined })}
              className="h-8 rounded-lg border border-border bg-surface px-2.5 text-body-small text-fg-secondary outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
          </>
        }
      />

      {chips.length > 0 ? (
        <FilterBar
          filters={chips}
          onRemove={(id) => narrow({ [id]: undefined } as Partial<AuditListQuery>)}
          onClearAll={() =>
            setQuery((current) => ({
              ...current,
              category: undefined,
              from: undefined,
              to: undefined,
              page: 1,
            }))
          }
        />
      ) : null}

      <DataTable
        caption={t('title')}
        data={data?.items}
        columns={columns}
        getRowId={(entry) => entry.id}
        loading={isPending}
        error={isError ? t('loadError') : null}
        onRetry={() => void refetch()}
        search={search}
        onClearSearch={() => setSearch('')}
        onRowClick={setViewing}
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

      <AuditEntryDrawer entry={viewing} onClose={() => setViewing(null)} />
    </div>
  );
}
