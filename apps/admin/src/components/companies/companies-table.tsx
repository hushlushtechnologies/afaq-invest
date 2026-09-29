'use client';

import { useLocale, useTranslations } from 'next-intl';
import { useMemo, useState, type ReactNode } from 'react';
import { Building2, Star } from 'lucide-react';

import {
  COMPANY_STATUSES,
  COMPANY_TYPES,
  COMPANY_VERIFICATIONS,
  type CompanyListItem,
  type CompanyListQuery,
  type Locale,
} from '@afaq/types';

import {
  Avatar,
  Button,
  createDataTableColumns,
  DataTable,
  FilterBar,
  TableToolbar,
  Tooltip,
  type ActiveFilter,
} from '@afaq/ui';
import { formatRelativeTime } from '@afaq/utils';

import { Link } from '@/i18n/navigation';
import { useDataTableLabels, useTableToolbarLabels } from '@/lib/i18n/use-component-labels';
import { useCompanyList, useCompanySectors } from '@/lib/companies/use-companies';
import { CompanyStatusBadge, CompanyTypeBadge, CompanyVerificationBadge } from './company-badges';
import { Can } from '@/components/auth/can';
import { CompanyRowActions } from './company-row-actions';
import { CreateCompanyDrawer } from './create-company-drawer';

const column = createDataTableColumns<CompanyListItem>();

/** The select styling used by both filters, matching the staff directory. */
const SELECT_CLASS =
  'h-8 rounded-lg border border-border bg-surface px-2.5 text-body-small text-fg-secondary outline-none focus-visible:ring-2 focus-visible:ring-ring';

/**
 * The company directory.
 *
 * Search, filters and paging all live in the address the API is asked for
 * rather than being applied to a list held in the browser — so the table
 * behaves the same with nine companies or nine hundred.
 *
 * The default order is the marketplace's own: featured first, then by hand-set
 * position. Sorting by any other column drops that, because somebody who asked
 * for alphabetical does not want four companies jumping the queue.
 */
export function CompaniesTable(): ReactNode {
  const t = useTranslations('companies');
  const locale = useLocale() as Locale;
  const tableLabels = useDataTableLabels();
  const toolbarLabels = useTableToolbarLabels();

  const [query, setQuery] = useState<CompanyListQuery>({ page: 1, pageSize: 25 });
  const [search, setSearch] = useState('');
  const [creating, setCreating] = useState(false);

  const { data: sectors } = useCompanySectors();
  const { data, isPending, isError, refetch } = useCompanyList({
    ...query,
    search: search || undefined,
  });

  /** Any change other than paging returns to the first page. */
  function narrow(changes: Partial<CompanyListQuery>): void {
    setQuery((current) => ({ ...current, ...changes, page: 1 }));
  }

  const columns = useMemo(
    () => [
      column.accessor('name', {
        header: t('columns.name'),
        meta: { mobile: 'title' },
        cell: ({ row }) => (
          <span className="flex items-center gap-3">
            {/* Falls back to initials when there is no logo, which is every
                company until somebody uploads one. */}
            <Avatar name={row.original.name} src={row.original.logoUrl ?? undefined} size="sm" />
            <span className="flex flex-col">
              <span className="flex items-center gap-1.5 font-medium text-fg">
                {/* The name is the way in, rather than a "View" item buried in
                    the row menu: it is the thing people already try to click. */}
                <Link
                  href={`/companies/${row.original.slug}`}
                  className="rounded-sm underline-offset-4 hover:text-accent hover:underline focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                >
                  {row.original.name}
                </Link>
                {row.original.isFeatured ? (
                  <>
                    {/* The tooltip only ever reaches a mouse: an <svg> takes no
                        focus, so its onFocus never fires and a keyboard user
                        would get nothing. The meaning therefore lives in text
                        for assistive technology, and the star is marked as
                        decoration so it is not announced twice. */}
                    <Tooltip content={t('featured')}>
                      <Star
                        aria-hidden="true"
                        className="size-3.5 shrink-0 fill-warning text-warning"
                      />
                    </Tooltip>
                    <span className="sr-only">{t('featured')}</span>
                  </>
                ) : null}
              </span>
              <span className="text-caption text-fg-muted">{row.original.sector}</span>
            </span>
          </span>
        ),
      }),
      column.accessor('type', {
        header: t('columns.type'),
        meta: { mobile: 'field', label: t('columns.type') },
        cell: ({ row }) => <CompanyTypeBadge type={row.original.type} />,
      }),
      column.accessor('status', {
        header: t('columns.status'),
        meta: { mobile: 'field', label: t('columns.status') },
        cell: ({ row }) => <CompanyStatusBadge status={row.original.status} />,
      }),
      column.accessor('verification', {
        header: t('columns.verification'),
        enableSorting: false,
        meta: { mobile: 'field', label: t('columns.verification') },
        cell: ({ row }) =>
          row.original.verification === 'NOT_REQUIRED' ? (
            <span className="text-fg-muted">{t('verification.notApplicable')}</span>
          ) : (
            <CompanyVerificationBadge verification={row.original.verification} />
          ),
      }),
      column.accessor('displayOrder', {
        header: t('columns.order'),
        meta: { mobile: 'field', label: t('columns.order'), align: 'end' },
        cell: ({ row }) => (
          <span className="text-numeric text-fg-secondary">{row.original.displayOrder}</span>
        ),
      }),
      column.accessor('updatedAt', {
        header: t('columns.updated'),
        meta: { mobile: 'field', label: t('columns.updated') },
        cell: ({ row }) => (
          <span className="text-fg-secondary">
            {formatRelativeTime(row.original.updatedAt, { locale })}
          </span>
        ),
      }),
      column.display({
        id: 'actions',
        header: '',
        meta: { align: 'end' },
        cell: ({ row }) => <CompanyRowActions company={row.original} />,
      }),
    ],
    [t, locale],
  );

  // Every filter in use, so each can be removed on its own.
  const chips: ActiveFilter[] = [
    ...(query.type
      ? [{ id: 'type', label: t('filters.type'), value: t(`type.${query.type}`) }]
      : []),
    ...(query.status
      ? [{ id: 'status', label: t('filters.status'), value: t(`status.${query.status}`) }]
      : []),
    ...(query.verification
      ? [
          {
            id: 'verification',
            label: t('filters.verification'),
            value: t(`verification.${query.verification}`),
          },
        ]
      : []),
    ...(query.sector ? [{ id: 'sector', label: t('filters.sector'), value: query.sector }] : []),
    ...(query.featuredOnly
      ? [{ id: 'featuredOnly', label: t('filters.featured'), value: t('featured') }]
      : []),
  ];

  return (
    <div className="space-y-4">
      <TableToolbar
        {...toolbarLabels}
        search={search}
        onSearchChange={setSearch}
        actions={
          <Can permission="company.create">
            <Button variant="gradient" iconStart={<Building2 />} onClick={() => setCreating(true)}>
              {t('create.action')}
            </Button>
          </Can>
        }
        searchPlaceholder={t('searchPlaceholder')}
        filters={
          <>
            <select
              aria-label={t('filters.type')}
              value={query.type ?? ''}
              onChange={(event) =>
                narrow({ type: (event.target.value || undefined) as CompanyListQuery['type'] })
              }

              className={SELECT_CLASS}
            >
              <option value="">{t('filters.allTypes')}</option>
              {COMPANY_TYPES.map((type) => (
                <option key={type} value={type}>
                  {t(`type.${type}`)}
                </option>
              ))}
            </select>

            <select
              aria-label={t('filters.status')}
              value={query.status ?? ''}
              onChange={(event) =>
                narrow({ status: (event.target.value || undefined) as CompanyListQuery['status'] })
              }
              className={SELECT_CLASS}
            >
              <option value="">{t('filters.allStatuses')}</option>
              {COMPANY_STATUSES.map((status) => (
                <option key={status} value={status}>
                  {t(`status.${status}`)}
                </option>
              ))}
            </select>

            <select
              aria-label={t('filters.verification')}
              value={query.verification ?? ''}
              onChange={(event) =>
                narrow({
                  verification: (event.target.value ||
                    undefined) as CompanyListQuery['verification'],
                })
              }
              className={SELECT_CLASS}
            >
              <option value="">{t('filters.allVerifications')}</option>
              {COMPANY_VERIFICATIONS.map((verification) => (
                <option key={verification} value={verification}>
                  {t(`verification.${verification}`)}
                </option>
              ))}
            </select>

            {/* Only offered once there is more than one sector to choose
                between — a filter with a single option is furniture. */}
            {(sectors?.length ?? 0) > 1 ? (
              <select
                aria-label={t('filters.sector')}
                value={query.sector ?? ''}
                onChange={(event) => narrow({ sector: event.target.value || undefined })}
                className={SELECT_CLASS}
              >
                <option value="">{t('filters.allSectors')}</option>
                {(sectors ?? []).map((sector) => (
                  <option key={sector} value={sector}>
                    {sector}
                  </option>
                ))}
              </select>
            ) : null}

            <label className="flex h-8 cursor-pointer items-center gap-2 rounded-lg border border-border bg-surface px-2.5 text-body-small text-fg-secondary">
              <input
                type="checkbox"
                checked={query.featuredOnly ?? false}
                onChange={(event) => narrow({ featuredOnly: event.target.checked || undefined })}
                className="size-3.5 accent-primary"
              />
              {t('filters.featured')}
            </label>
          </>
        }
      />

      {chips.length > 0 ? (
        <FilterBar
          filters={chips}
          onRemove={(id) => narrow({ [id]: undefined } as Partial<CompanyListQuery>)}
          onClearAll={() =>
            setQuery((current) => ({
              ...current,
              type: undefined,
              status: undefined,
              verification: undefined,
              sector: undefined,
              featuredOnly: undefined,
              page: 1,
            }))
          }
        />
      ) : null}

      <DataTable
        caption={t('title')}
        data={data?.items}
        columns={columns}
        getRowId={(company) => company.id}
        loading={isPending}
        error={isError ? t('loadError') : null}
        onRetry={() => void refetch()}
        search={search}
        onClearSearch={() => setSearch('')}
        empty={{
          title: t('empty.title'),
          description: t('empty.description'),
        }}
        labels={tableLabels}
        pageSize={query.pageSize ?? 25}
        pageSizeOptions={[10, 25, 50]}
        // The API returns one page at a time, so the footer drives the next
        // request rather than paging through rows already in hand.
        serverPagination={{
          page: query.page ?? 1,
          totalItems: data?.total ?? 0,
          onPageChange: (page) => setQuery((current) => ({ ...current, page })),
          onPageSizeChange: (pageSize) =>
            setQuery((current) => ({ ...current, pageSize, page: 1 })),
        }}
      />

      <CreateCompanyDrawer open={creating} onClose={() => setCreating(false)} />
    </div>
  );
}
