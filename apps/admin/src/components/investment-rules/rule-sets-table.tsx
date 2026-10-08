'use client';

import { useLocale, useTranslations } from 'next-intl';
import { useMemo, useState, type ReactNode } from 'react';
import { Layers } from 'lucide-react';

import { RULE_SET_SCOPES, RULE_SET_STATUSES, type Locale, type RuleSetListItem } from '@afaq/types';

import {
  Button,
  createDataTableColumns,
  DataTable,
  FilterBar,
  TableToolbar,
  type ActiveFilter,
} from '@afaq/ui';
import { formatRelativeTime } from '@afaq/utils';

import { Link } from '@/i18n/navigation';
import { useDataTableLabels, useTableToolbarLabels } from '@/lib/i18n/use-component-labels';
import { useRuleSetList, type RuleSetListQuery } from '@/lib/investment-rules/use-investment-rules';
import { Can } from '@/components/auth/can';
import { CreateRuleSetDrawer } from './create-rule-set-drawer';
import { RuleSetScopeBadge, RuleSetStatusBadge } from './rule-set-badges';

const column = createDataTableColumns<RuleSetListItem>();

/** The select styling used across the admin filters. */
const SELECT_CLASS =
  'h-8 rounded-lg border border-border bg-surface px-2.5 text-body-small text-fg-secondary outline-none focus-visible:ring-2 focus-visible:ring-ring';

/**
 * Every version of every ladder, ever.
 *
 * Ordered live first, then drafts, then the archive — the order somebody
 * scanning the screen is looking for them in. The archive is deliberately in
 * the same list rather than hidden behind a toggle: the whole reason old
 * versions are kept is so somebody can find the one an investor was sold
 * under, and a list they have to go looking for does not serve that.
 *
 * No search box: rule sets are counted in dozens, not thousands, and the
 * filters below narrow them faster than typing would.
 */
export function RuleSetsTable(): ReactNode {
  const t = useTranslations('investmentRules');
  const locale = useLocale() as Locale;
  const tableLabels = useDataTableLabels();
  const toolbarLabels = useTableToolbarLabels();

  const [query, setQuery] = useState<RuleSetListQuery>({ page: 1, pageSize: 25 });
  const [creating, setCreating] = useState(false);

  const { data, isPending, isError, refetch } = useRuleSetList(query);

  /** Any change other than paging returns to the first page. */
  function narrow(changes: Partial<RuleSetListQuery>): void {
    setQuery((current) => ({ ...current, ...changes, page: 1 }));
  }

  const columns = useMemo(
    () => [
      column.accessor('name', {
        header: t('columns.name'),
        meta: { mobile: 'title' },
        cell: ({ row }) => (
          <span className="flex flex-col">
            <span className="flex items-center gap-2">
              <Link
                href={`/investments/rules/${row.original.id}`}
                className="rounded-sm font-medium text-fg underline-offset-4 hover:text-accent hover:underline focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
              >
                {row.original.name}
              </Link>
              <span className="text-caption text-fg-muted">v{row.original.version}</span>
            </span>
            <span className="text-caption text-fg-muted">
              {t('tierCount', { count: row.original.tierCount })}
            </span>
          </span>
        ),
      }),
      column.accessor('status', {
        header: t('columns.status'),
        meta: { mobile: 'field', label: t('columns.status') },
        cell: ({ row }) => <RuleSetStatusBadge status={row.original.status} />,
      }),
      column.accessor('scope', {
        header: t('columns.scope'),
        enableSorting: false,
        meta: { mobile: 'field', label: t('columns.scope') },
        cell: ({ row }) => (
          <RuleSetScopeBadge scope={row.original.scope} companyName={row.original.companyName} />
        ),
      }),
      column.accessor('roiBasis', {
        header: t('columns.basis'),
        enableSorting: false,
        meta: { mobile: 'field', label: t('columns.basis') },
        cell: ({ row }) => (
          <span className="text-fg-secondary">{t(`basis.${row.original.roiBasis}`)}</span>
        ),
      }),
      column.accessor('effectiveFrom', {
        header: t('columns.live'),
        enableSorting: false,
        meta: { mobile: 'field', label: t('columns.live') },
        cell: ({ row }) => {
          const { effectiveFrom, effectiveTo } = row.original;

          // A draft has never been live, so it gets a dash rather than a date
          // that would have to be invented.
          if (!effectiveFrom) return <span className="text-fg-muted">—</span>;

          return (
            <span className="flex flex-col text-body-small">
              <span className="text-fg-secondary">
                {formatRelativeTime(effectiveFrom, { locale })}
              </span>
              {effectiveTo ? (
                <span className="text-caption text-fg-muted">
                  {t('until', { when: formatRelativeTime(effectiveTo, { locale }) })}
                </span>
              ) : null}
            </span>
          );
        },
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
    ],
    [t, locale],
  );

  const chips: ActiveFilter[] = [
    ...(query.status
      ? [{ id: 'status', label: t('filters.status'), value: t(`status.${query.status}`) }]
      : []),
    ...(query.scope
      ? [{ id: 'scope', label: t('filters.scope'), value: t(`scope.${query.scope}`) }]
      : []),
  ];

  return (
    <div className="space-y-4">
      <TableToolbar
        {...toolbarLabels}
        // No onSearchChange, so the toolbar renders no search box — see the
        // note on this component for why rule sets do not need one.
        actions={
          <Can permission="investment_rule.manage">
            <Button variant="gradient" iconStart={<Layers />} onClick={() => setCreating(true)}>
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
                narrow({ status: (event.target.value || undefined) as RuleSetListQuery['status'] })
              }
              className={SELECT_CLASS}
            >
              <option value="">{t('filters.allStatuses')}</option>
              {RULE_SET_STATUSES.map((status) => (
                <option key={status} value={status}>
                  {t(`status.${status}`)}
                </option>
              ))}
            </select>

            <select
              aria-label={t('filters.scope')}
              value={query.scope ?? ''}
              onChange={(event) =>
                narrow({ scope: (event.target.value || undefined) as RuleSetListQuery['scope'] })
              }
              className={SELECT_CLASS}
            >
              <option value="">{t('filters.allScopes')}</option>
              {RULE_SET_SCOPES.map((scope) => (
                <option key={scope} value={scope}>
                  {t(`scope.${scope}`)}
                </option>
              ))}
            </select>
          </>
        }
      />

      {chips.length > 0 ? (
        <FilterBar
          filters={chips}
          onRemove={(id) => narrow({ [id]: undefined } as Partial<RuleSetListQuery>)}
          onClearAll={() =>
            setQuery((current) => ({ ...current, status: undefined, scope: undefined, page: 1 }))
          }
        />
      ) : null}

      <DataTable
        caption={t('title')}
        data={data?.items}
        columns={columns}
        getRowId={(ruleSet) => ruleSet.id}
        loading={isPending}
        error={isError ? t('loadError') : null}
        onRetry={() => void refetch()}
        empty={{
          // Only reachable before the seed has run, or after somebody has
          // archived everything — so the copy says what to do, not just that
          // the list is empty.
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

      <CreateRuleSetDrawer open={creating} onClose={() => setCreating(false)} />
    </div>
  );
}
