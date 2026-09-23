'use client';

import { useTable, type RowData, type RowSelectionState } from '@tanstack/react-table';
import { ArrowDown, ArrowUp, ChevronsUpDown } from 'lucide-react';
import {
  useDeferredValue,
  useEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
  type MouseEvent,
  type ReactNode,
} from 'react';
import { cn } from '@afaq/utils';
import { Button } from '../button/button';
import { Checkbox } from '../form/checkbox';
import { Select } from '../form/select';
import { Pagination, type PaginationLabels } from '../navigation/pagination';
import { EmptyState } from '../state/empty-state';
import { ErrorState } from '../state/error-state';
import { Skeleton } from '../state/skeleton';
import {
  dataTableFeatures,
  type DataTableColumn,
  type DataTableColumnMeta,
} from './data-table-features';

// A stable empty array, so a missing `data` never looks like "new data" to the table.
const NO_ROWS: never[] = [];

const ALIGN: Record<NonNullable<DataTableColumnMeta['align']>, string> = {
  start: 'text-start',
  center: 'text-center',
  end: 'text-end',
};

export interface DataTableEmptyState {
  title: string;
  description?: string;
  action?: ReactNode;
}

export interface DataTableLabels {
  selectAll: string;
  selectRow: string;
  loading: string;
  errorTitle: string;
  retry: string;
  noResultsTitle: string;
  noResultsDescription: (search: string) => string;
  clearSearch: string;
  rowsPerPage: string;
  pagination?: Partial<PaginationLabels>;
}

const DEFAULT_LABELS: DataTableLabels = {
  selectAll: 'Select all rows on this page',
  selectRow: 'Select row',
  loading: 'Loading',
  errorTitle: 'Could not load this data',
  retry: 'Try again',
  noResultsTitle: 'No matching results',
  noResultsDescription: (search) =>
    `Nothing matches “${search}”. Check the spelling or clear the search.`,
  clearSearch: 'Clear search',
  rowsPerPage: 'Rows per page',
};

export interface DataTableProps<TData extends RowData> {
  /**
   * The rows. Keep the array stable between renders (state, useMemo or query
   * data) — a brand-new array every render makes the table recalculate.
   */
  data: readonly TData[] | undefined;
  columns: readonly DataTableColumn<TData>[];
  /** A unique id for each row — required for selection to survive sorting and paging. */
  getRowId: (row: TData) => string;
  /** Read by screen readers as the table's name, e.g. "Investors". */
  caption: string;
  /** Search text, usually from <TableToolbar>. Matches across all data columns. */
  search?: string;
  onClearSearch?: () => void;
  loading?: boolean;
  /** An error message. Shows an error panel instead of rows. */
  error?: string | null;
  onRetry?: () => void;
  /** Shown when there is no data at all (not when a search finds nothing). */
  empty?: DataTableEmptyState;
  pageSize?: number;
  /** Offer a "rows per page" choice. */
  pageSizeOptions?: readonly number[];
  /** Adds a checkbox column. */
  enableSelection?: boolean;
  /** Receives the selected rows whenever the selection changes (not on every render). */
  onSelectionChange?: (rows: TData[]) => void;
  /** Makes whole rows clickable (and keyboard-activatable), e.g. to open a detail page. */
  onRowClick?: (row: TData) => void;
  labels?: Partial<DataTableLabels>;
  className?: string;
}

/**
 * The standard data table: sortable columns, search, pagination, optional
 * selection, and loading / empty / error states. Below 768px every row becomes
 * a card, so nothing needs sideways scrolling on a phone.
 */
export function DataTable<TData extends RowData>({
  data,
  columns,
  getRowId,
  caption,
  search = '',
  onClearSearch,
  loading = false,
  error = null,
  onRetry,
  empty,
  pageSize = 10,
  pageSizeOptions,
  enableSelection = false,
  onSelectionChange,
  onRowClick,
  labels,
  className,
}: DataTableProps<TData>): ReactNode {
  const text = { ...DEFAULT_LABELS, ...labels };
  const rows = (data ?? NO_ROWS) as TData[];
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});

  // Typing stays responsive on large lists: filtering waits for a quiet moment.
  const deferredSearch = useDeferredValue(search);

  const allColumns = useMemo<DataTableColumn<TData>[]>(() => {
    if (!enableSelection) return [...columns];
    const selectColumn: DataTableColumn<TData> = {
      id: '__select',
      enableSorting: false,
      enableGlobalFilter: false,
      meta: { width: '3rem', mobile: 'hidden' },
      header: ({ table }) => (
        <Checkbox
          aria-label={text.selectAll}
          checked={table.getIsAllPageRowsSelected()}
          indeterminate={table.getIsSomePageRowsSelected()}
          onChange={() => table.toggleAllPageRowsSelected()}
        />
      ),
      cell: ({ row }) => (
        <Checkbox
          aria-label={text.selectRow}
          checked={row.getIsSelected()}
          disabled={!row.getCanSelect()}
          onChange={() => row.toggleSelected()}
        />
      ),
    };
    return [selectColumn, ...columns];
  }, [columns, enableSelection, text.selectAll, text.selectRow]);

  const table = useTable({
    features: dataTableFeatures,
    columns: allColumns,
    data: rows,
    getRowId,
    enableRowSelection: enableSelection,
    initialState: { pagination: { pageIndex: 0, pageSize } },
    // The search text is owned by the page (it lives in the toolbar), so it is
    // passed in as controlled state rather than copied into the table.
    state: { rowSelection, globalFilter: deferredSearch },
    onRowSelectionChange: setRowSelection,
    onGlobalFilterChange: () => undefined,
  });

  // Report the selected rows whenever — and only when — the selection changes.
  // Rows and the callback are read through refs, so a parent that passes a new
  // array or function on every render can't start an update loop.
  const latest = useRef({ rows, getRowId, onSelectionChange });
  latest.current = { rows, getRowId, onSelectionChange };

  useEffect(() => {
    const { rows: current, getRowId: idOf, onSelectionChange: report } = latest.current;
    report?.(current.filter((row) => rowSelection[idOf(row)]));
  }, [rowSelection]);

  const pageRows = table.getRowModel().rows;
  const matchingCount = table.getFilteredRowModel().rows.length;
  const { pageIndex, pageSize: currentPageSize } = table.state.pagination;
  const leafColumns = table.getAllLeafColumns();
  const titleColumn = leafColumns.find((column) => column.columnDef.meta?.mobile === 'title');

  function columnLabel(columnId: string): string {
    const column = leafColumns.find((item) => item.id === columnId);
    if (!column) return columnId;
    if (column.columnDef.meta?.label) return column.columnDef.meta.label;
    return typeof column.columnDef.header === 'string' ? column.columnDef.header : column.id;
  }

  // Row clicks ignore presses on buttons, links and inputs inside the row.
  function isFromControl(target: EventTarget): boolean {
    return (
      target instanceof Element &&
      target.closest('button, a, input, label, [role="menuitem"]') !== null
    );
  }

  function rowHandlers(original: TData) {
    if (!onRowClick) return {};
    return {
      tabIndex: 0,
      onClick: (event: MouseEvent) => {
        if (!isFromControl(event.target)) onRowClick(original);
      },
      onKeyDown: (event: KeyboardEvent) => {
        if (event.key === 'Enter' && event.target === event.currentTarget) onRowClick(original);
      },
    };
  }

  const status: 'loading' | 'error' | 'empty' | 'no-results' | 'ready' = loading
    ? 'loading'
    : error
      ? 'error'
      : rows.length === 0
        ? 'empty'
        : matchingCount === 0
          ? 'no-results'
          : 'ready';

  function renderState(): ReactNode {
    if (status === 'error') {
      return (
        <ErrorState
          title={text.errorTitle}
          description={error ?? undefined}
          onRetry={onRetry}
          retryLabel={text.retry}
        />
      );
    }
    if (status === 'empty') {
      return (
        <EmptyState
          title={empty?.title ?? 'Nothing here yet'}
          description={empty?.description}
          action={empty?.action}
        />
      );
    }
    if (status === 'no-results') {
      return (
        <EmptyState
          kind="no-results"
          title={text.noResultsTitle}
          description={text.noResultsDescription(search)}
          action={
            onClearSearch ? (
              <Button variant="outline" size="sm" onClick={onClearSearch}>
                {text.clearSearch}
              </Button>
            ) : undefined
          }
        />
      );
    }
    return null;
  }

  const skeletonRows = Array.from({ length: Math.min(currentPageSize, 6) }, (_, index) => index);

  return (
    <div
      className={cn(
        'min-w-0 overflow-hidden rounded-xl border border-border bg-surface',
        className,
      )}
    >
      {/* ---------- Desktop and tablet: a real table ---------- */}
      <div className="hidden overflow-x-auto md:block">
        <table className="w-full border-collapse text-body-small" aria-busy={loading || undefined}>
          <caption className="sr-only">{caption}</caption>
          <thead className="bg-background-subtle">
            {table.getHeaderGroups().map((group) => (
              <tr key={group.id} className="border-b border-border">
                {group.headers.map((header) => {
                  const meta = header.column.columnDef.meta;
                  const sortable = header.column.getCanSort();
                  const sorted = header.column.getIsSorted();
                  return (
                    <th
                      key={header.id}
                      scope="col"
                      style={meta?.width ? { width: meta.width } : undefined}
                      aria-sort={
                        sorted === 'asc'
                          ? 'ascending'
                          : sorted === 'desc'
                            ? 'descending'
                            : sortable
                              ? 'none'
                              : undefined
                      }
                      className={cn(
                        'h-10 px-4 text-caption font-medium whitespace-nowrap text-fg-subtle',
                        ALIGN[meta?.align ?? 'start'],
                      )}
                    >
                      {header.isPlaceholder ? null : sortable ? (
                        <button
                          type="button"
                          onClick={header.column.getToggleSortingHandler()}
                          className={cn(
                            'inline-flex items-center gap-1 rounded outline-none hover:text-fg focus-visible:ring-2 focus-visible:ring-ring',
                            meta?.align === 'end' && 'flex-row-reverse',
                            sorted && 'text-fg',
                          )}
                        >
                          <table.FlexRender header={header} />
                          {sorted === 'asc' ? (
                            <ArrowUp className="size-3.5" aria-hidden="true" />
                          ) : sorted === 'desc' ? (
                            <ArrowDown className="size-3.5" aria-hidden="true" />
                          ) : (
                            <ChevronsUpDown className="size-3.5 opacity-50" aria-hidden="true" />
                          )}
                        </button>
                      ) : (
                        <table.FlexRender header={header} />
                      )}
                    </th>
                  );
                })}
              </tr>
            ))}
          </thead>
          <tbody>
            {status === 'loading'
              ? skeletonRows.map((index) => (
                  <tr key={index} className="border-b border-border-subtle last:border-0">
                    {leafColumns.map((column) => (
                      <td key={column.id} className="h-13 px-4">
                        <Skeleton shape="text" width="75%" />
                      </td>
                    ))}
                  </tr>
                ))
              : status === 'ready'
                ? pageRows.map((row) => (
                    <tr
                      key={row.id}
                      data-state={row.getIsSelected() ? 'selected' : undefined}
                      {...rowHandlers(row.original)}
                      className={cn(
                        'border-b border-border-subtle transition-colors last:border-0',
                        'hover:bg-surface-hover data-[state=selected]:bg-primary/6',
                        onRowClick &&
                          'cursor-pointer outline-none focus-visible:bg-surface-hover focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset',
                      )}
                    >
                      {row.getAllCells().map((cell) => (
                        <td
                          key={cell.id}
                          className={cn(
                            'h-13 px-4 text-fg-secondary',
                            ALIGN[cell.column.columnDef.meta?.align ?? 'start'],
                          )}
                        >
                          <table.FlexRender cell={cell} />
                        </td>
                      ))}
                    </tr>
                  ))
                : null}
          </tbody>
        </table>
      </div>

      {/* ---------- Phones: each row becomes a card ---------- */}
      <div className="md:hidden" aria-busy={loading || undefined}>
        {enableSelection && status === 'ready' ? (
          <div className="border-b border-border-subtle px-4 py-3">
            <Checkbox
              label={text.selectAll}
              checked={table.getIsAllPageRowsSelected()}
              indeterminate={table.getIsSomePageRowsSelected()}
              onChange={() => table.toggleAllPageRowsSelected()}
            />
          </div>
        ) : null}
        <ul aria-label={caption} className="divide-y divide-border-subtle">
          {status === 'loading'
            ? skeletonRows.slice(0, 4).map((index) => (
                <li key={index} className="space-y-2.5 p-4">
                  <Skeleton shape="text" width="50%" height="1rem" />
                  <Skeleton shape="text" width="75%" />
                  <Skeleton shape="text" width="66%" />
                </li>
              ))
            : status === 'ready'
              ? pageRows.map((row) => {
                  const cells = row.getAllCells();
                  const find = (kind: DataTableColumnMeta['mobile']) =>
                    cells.filter(
                      (cell) => (cell.column.columnDef.meta?.mobile ?? 'field') === kind,
                    );
                  const titleCell = titleColumn
                    ? cells.find((cell) => cell.column.id === titleColumn.id)
                    : undefined;

                  return (
                    <li
                      key={row.id}
                      data-state={row.getIsSelected() ? 'selected' : undefined}
                      {...rowHandlers(row.original)}
                      className={cn(
                        'flex gap-3 p-4 data-[state=selected]:bg-primary/6',
                        onRowClick &&
                          'cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset',
                      )}
                    >
                      {enableSelection ? (
                        <Checkbox
                          aria-label={text.selectRow}
                          checked={row.getIsSelected()}
                          disabled={!row.getCanSelect()}
                          onChange={() => row.toggleSelected()}
                          wrapperClassName="pt-0.5"
                        />
                      ) : null}
                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            {titleCell ? (
                              <div className="font-medium text-fg">
                                <table.FlexRender cell={titleCell} />
                              </div>
                            ) : null}
                            {find('subtitle').map((cell) => (
                              <div key={cell.id} className="mt-0.5 text-caption text-fg-muted">
                                <table.FlexRender cell={cell} />
                              </div>
                            ))}
                          </div>
                          {find('actions').map((cell) => (
                            <div key={cell.id} className="-me-2 -mt-1 shrink-0">
                              <table.FlexRender cell={cell} />
                            </div>
                          ))}
                        </div>
                        {find('field').length > 0 ? (
                          <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2.5">
                            {find('field').map((cell) => (
                              <div key={cell.id} className="min-w-0">
                                <dt className="text-caption text-fg-muted">
                                  {columnLabel(cell.column.id)}
                                </dt>
                                <dd className="mt-0.5 truncate text-body-small text-fg-secondary">
                                  <table.FlexRender cell={cell} />
                                </dd>
                              </div>
                            ))}
                          </dl>
                        ) : null}
                      </div>
                    </li>
                  );
                })
              : null}
        </ul>
      </div>

      {status === 'loading' ? (
        <span className="sr-only" role="status">
          {text.loading}
        </span>
      ) : null}
      {renderState()}

      {status === 'ready' ? (
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border-subtle px-4 py-3">
          {pageSizeOptions && pageSizeOptions.length > 0 ? (
            <label className="flex items-center gap-2 text-caption text-fg-muted">
              {text.rowsPerPage}
              <Select
                fieldSize="sm"
                wrapperClassName="w-20"
                value={String(currentPageSize)}
                onChange={(event) => table.setPageSize(Number(event.target.value))}
                options={pageSizeOptions.map((size) => ({
                  value: String(size),
                  label: String(size),
                }))}
              />
            </label>
          ) : null}
          <Pagination
            className="flex-1"
            page={pageIndex + 1}
            pageCount={table.getPageCount()}
            onPageChange={(page) => table.setPageIndex(page - 1)}
            totalItems={matchingCount}
            pageSize={currentPageSize}
            labels={text.pagination}
          />
        </div>
      ) : null}
    </div>
  );
}
