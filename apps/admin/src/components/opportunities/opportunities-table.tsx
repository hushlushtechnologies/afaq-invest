'use client';

import { useLocale, useTranslations } from 'next-intl';
import { useMemo, useState, type ReactNode } from 'react';
import { Plus, Star } from 'lucide-react';

import {
  COMPANY_TYPES,
  OPPORTUNITY_STATUSES,
  type Locale,
  type OpportunityListItem,
  type OpportunityListQuery,
} from '@afaq/types';
import {
  Button,
  createDataTableColumns,
  DataTable,
  FilterBar,
  Switch,
  TableToolbar,
  Tooltip,
  type ActiveFilter,
} from '@afaq/ui';
import { formatRelativeTime } from '@afaq/utils';

import { Can } from '@/components/auth/can';
import { CompanyTypeBadge } from '@/components/companies/company-badges';
import { Link } from '@/i18n/navigation';
import { useDataTableLabels, useTableToolbarLabels } from '@/lib/i18n/use-component-labels';
import { useOpportunityList } from '@/lib/opportunities/use-opportunities';
import { CreateOpportunityDrawer } from './create-opportunity-drawer';
import { ClosingLabel, FundingProgress, OpportunityStatusBadge } from './opportunity-badges';

const column = createDataTableColumns<OpportunityListItem>();

/** The select styling used across the admin filters. */
const SELECT_CLASS =
  'h-8 rounded-lg border border-border bg-surface px-2.5 text-body-small text-fg-secondary outline-none focus-visible:ring-2 focus-visible:ring-ring';

/**
 * Every raise, from first draft to long closed.
 *
 * Searching, filtering and paging all happen in the API, so the table behaves
 * the same with ten raises or ten thousand. The default order is the
 * marketplace's own — Afaq's companies first, then featured, then by hand-set
 * position — so what staff see at the top is what investors will see at the
 * top.
 *
 * "Live only" is a switch rather than a status option because it is the
 * question people actually ask ("what is running?") and it spans two
 * statuses. Choosing a status explicitly takes priority over it, on the API
 * as well as here, so the two can never combine into a filter that matches
 * nothing.
 */
export function OpportunitiesTable({ currency }: { currency: string }): ReactNode {
  const t = useTranslations('opportunities');
  // The company list's own words for the two kinds, so the filter and the
  // badge in each row cannot drift apart.
  const tCompanyType = useTranslations('companies.type');
  const locale = useLocale() as Locale;
  const tableLabels = useDataTableLabels();
  const toolbarLabels = useTableToolbarLabels();

  const [query, setQuery] = useState<OpportunityListQuery>({ page: 1, pageSize: 25 });
  const [search, setSearch] = useState('');
  const [creating, setCreating] = useState(false);

  const { data, isPending, isError, refetch } = useOpportunityList({
    ...query,
    search: search.trim() || undefined,
  });

  /** Any change other than paging returns to the first page. */
  function narrow(changes: Partial<OpportunityListQuery>): void {
    setQuery((current) => ({ ...current, ...changes, page: 1 }));
  }

  const columns = useMemo(
    () => [
      column.accessor('title', {
        header: t('columns.title'),
        enableSorting: false,
        meta: { mobile: 'title' },
        cell: ({ row }) => (
          <span className="flex min-w-0 flex-col">
            <span className="flex items-center gap-1.5 font-medium text-fg">
              <Link
                href={`/investments/opportunities/${row.original.id}`}
                className="rounded-sm underline-offset-4 hover:text-accent hover:underline focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
              >
                {row.original.title}
              </Link>
              {row.original.isFeatured ? (
                <>
                  {/* The star is decoration for a mouse; the words are what a
                      screen reader gets, the same as on the company list. */}
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
            {row.original.summary ? (
              <span className="line-clamp-1 text-caption text-fg-muted">
                {row.original.summary}
              </span>
            ) : null}
          </span>
        ),
      }),
      column.accessor('companyName', {
        header: t('columns.company'),
        enableSorting: false,
        meta: { mobile: 'field', label: t('columns.company') },
        cell: ({ row }) => (
          <span className="flex flex-col items-start gap-1">
            <Link
              href={`/companies/${row.original.companySlug}`}
              className="rounded-sm text-fg-secondary underline-offset-4 hover:text-accent hover:underline focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
            >
              {row.original.companyName}
            </Link>
            <CompanyTypeBadge type={row.original.companyType} />
          </span>
        ),
      }),
      column.accessor('status', {
        header: t('columns.status'),
        enableSorting: false,
        meta: { mobile: 'field', label: t('columns.status') },
        cell: ({ row }) => <OpportunityStatusBadge status={row.original.status} />,
      }),
      column.accessor('fundingPercent', {
        header: t('columns.funding'),
        enableSorting: false,
        meta: { mobile: 'field', label: t('columns.funding') },
        cell: ({ row }) => (
          <FundingProgress
            compact
            committed={row.original.committedAmount}
            target={row.original.targetAmount}
            percent={row.original.fundingPercent}
            currency={currency}
          />
        ),
      }),
      column.accessor('closesAt', {
        header: t('columns.closes'),
        enableSorting: false,
        meta: { mobile: 'field', label: t('columns.closes') },
        cell: ({ row }) => (
          <span className="text-body-small">
            <ClosingLabel status={row.original.status} closesAt={row.original.closesAt} />
          </span>
        ),
      }),
      column.accessor('updatedAt', {
        header: t('columns.updated'),
        enableSorting: false,
        meta: { mobile: 'field', label: t('columns.updated') },
        cell: ({ row }) => (
          <span className="text-fg-secondary">
            {formatRelativeTime(row.original.updatedAt, { locale })}
          </span>
        ),
      }),
    ],
    [t, locale, currency],
  );

  const chips: ActiveFilter[] = [
    ...(query.status
      ? [{ id: 'status', label: t('filters.status'), value: t(`status.${query.status}`) }]
      : []),
    ...(query.companyType
      ? [
          {
            id: 'companyType',
            label: t('filters.companyType'),
            value: tCompanyType(query.companyType),
          },
        ]
      : []),
    ...(query.liveOnly && !query.status
      ? [{ id: 'liveOnly', label: t('filters.liveOnly'), value: t('filters.yes') }]
      : []),
  ];

  return (
    <div className="space-y-4">
      <TableToolbar
        {...toolbarLabels}
        search={search}
        onSearchChange={(value) => {
          setSearch(value);
          // A new search starts at the first page, the same as a filter.
          setQuery((current) => ({ ...current, page: 1 }));
        }}
        searchPlaceholder={t('searchPlaceholder')}
        actions={
          <Can permission="opportunity.create">
            <Button variant="gradient" iconStart={<Plus />} onClick={() => setCreating(true)}>
              {t('create.action')}
            </Button>
          </Can>
        }
        filters={
          <>
            <select
              aria-label={t('filters.status')}
              value={query.status ?? ''}
              onChange={(event) =>
                narrow({
                  status: (event.target.value || undefined) as OpportunityListQuery['status'],
                })
              }
              className={SELECT_CLASS}
            >
              <option value="">{t('filters.allStatuses')}</option>
              {OPPORTUNITY_STATUSES.map((status) => (
                <option key={status} value={status}>
                  {t(`status.${status}`)}
                </option>
              ))}
            </select>

            <select
              aria-label={t('filters.companyType')}
              value={query.companyType ?? ''}
              onChange={(event) =>
                narrow({
                  companyType: (event.target.value ||
                    undefined) as OpportunityListQuery['companyType'],
                })
              }
              className={SELECT_CLASS}
            >
              <option value="">{t('filters.allCompanyTypes')}</option>
              {COMPANY_TYPES.map((type) => (
                <option key={type} value={type}>
                  {tCompanyType(type)}
                </option>
              ))}
            </select>

            <Switch
              switchSize="sm"
              label={t('filters.liveOnly')}
              checked={query.liveOnly ?? false}
              // An explicit status already says exactly what to show.
              disabled={query.status !== undefined}
              onChange={(event) => narrow({ liveOnly: event.target.checked || undefined })}
            />
          </>
        }
      />

      {chips.length > 0 ? (
        <FilterBar
          filters={chips}
          onRemove={(id) => narrow({ [id]: undefined } as Partial<OpportunityListQuery>)}
          onClearAll={() =>
            setQuery((current) => ({
              ...current,
              status: undefined,
              companyType: undefined,
              liveOnly: undefined,
              page: 1,
            }))
          }
        />
      ) : null}

      <DataTable
        caption={t('title')}
        data={data?.items}
        columns={columns}
        getRowId={(opportunity) => opportunity.id}
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
        serverPagination={{
          page: query.page ?? 1,
          totalItems: data?.total ?? 0,
          onPageChange: (page) => setQuery((current) => ({ ...current, page })),
          onPageSizeChange: (pageSize) =>
            setQuery((current) => ({ ...current, pageSize, page: 1 })),
        }}
      />

      <CreateOpportunityDrawer
        open={creating}
        onClose={() => setCreating(false)}
        currency={currency}
      />
    </div>
  );
}
