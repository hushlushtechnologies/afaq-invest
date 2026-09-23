import {
  columnFilteringFeature,
  createColumnHelper,
  createFilteredRowModel,
  createPaginatedRowModel,
  createSortedRowModel,
  globalFilteringFeature,
  rowPaginationFeature,
  rowSelectionFeature,
  rowSortingFeature,
  tableFeatures,
  type ColumnDef,
  type RowData,
} from '@tanstack/react-table';

/** Extra settings each column can carry. */
export interface DataTableColumnMeta {
  /** 'end' for money and numbers, so figures line up. Flips in Arabic. */
  align?: 'start' | 'center' | 'end';
  /**
   * How the column appears in the phone layout, where each row becomes a card:
   * - 'title'    the card's heading (use once)
   * - 'subtitle' a line under the heading
   * - 'field'    a label/value pair (the default)
   * - 'actions'  the card's top corner, e.g. the row menu
   * - 'hidden'   left out on phones
   */
  mobile?: 'title' | 'subtitle' | 'field' | 'actions' | 'hidden';
  /** Label for the phone layout when the header isn't plain text. */
  label?: string;
  /** Fixed width on desktop, e.g. '3rem' for a checkbox column. */
  width?: string;
}

/**
 * The table capabilities every DataTable has: sorting, search, pagination and
 * row selection. TanStack Table v9 only includes what is registered here.
 * Keep this at module level — the features object must be stable.
 */
export const dataTableFeatures = tableFeatures({
  rowSortingFeature,
  sortedRowModel: createSortedRowModel(),
  columnFilteringFeature,
  globalFilteringFeature,
  filteredRowModel: createFilteredRowModel(),
  rowPaginationFeature,
  paginatedRowModel: createPaginatedRowModel(),
  rowSelectionFeature,
  columnMeta: {} as DataTableColumnMeta,
});

export type DataTableFeatures = typeof dataTableFeatures;

/** A column definition for DataTable. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- each column has its own value type
export type DataTableColumn<TData extends RowData> = ColumnDef<DataTableFeatures, TData, any>;

/**
 * Typed helper for building DataTable columns:
 *
 *   const col = createDataTableColumns<Investor>();
 *   const columns = col.columns([
 *     col.accessor('name', { header: 'Name', meta: { mobile: 'title' } }),
 *   ]);
 */
export function createDataTableColumns<TData extends RowData>() {
  return createColumnHelper<DataTableFeatures, TData>();
}
