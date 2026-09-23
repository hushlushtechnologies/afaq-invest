'use client';

import { X } from 'lucide-react';
import type { ReactNode } from 'react';
import { cn } from '@afaq/utils';
import { Button } from '../button/button';
import { SearchInput } from '../form/search-input';

export interface TableToolbarProps {
  search?: string;
  onSearchChange?: (value: string) => void;
  searchPlaceholder?: string;
  searchLabel?: string;
  /** Filter controls — a Popover, a Select, or a <FilterBar>. */
  filters?: ReactNode;
  /** Buttons on the trailing side, e.g. Export or Add. */
  actions?: ReactNode;
  /** How many rows are selected. Above 0, the toolbar shows the bulk-action bar. */
  selectedCount?: number;
  /** Buttons that act on the selected rows. */
  bulkActions?: ReactNode;
  onClearSelection?: () => void;
  selectedLabel?: (count: number) => string;
  clearSelectionLabel?: string;
  className?: string;
}

/** Sits above a DataTable: search, filters and actions — or bulk actions while rows are selected. */
export function TableToolbar({
  search,
  onSearchChange,
  searchPlaceholder = 'Search',
  searchLabel = 'Search the table',
  filters,
  actions,
  selectedCount = 0,
  bulkActions,
  onClearSelection,
  selectedLabel = (count) => `${count} selected`,
  clearSelectionLabel = 'Clear selection',
  className,
}: TableToolbarProps): ReactNode {
  if (selectedCount > 0) {
    return (
      <div
        role="region"
        aria-label={selectedLabel(selectedCount)}
        className={cn(
          'flex min-h-11 flex-wrap items-center gap-3 rounded-xl border border-primary/25 bg-primary/8 px-3 py-2',
          className,
        )}
      >
        <span className="text-label text-primary-strong" aria-live="polite">
          {selectedLabel(selectedCount)}
        </span>
        <div className="flex flex-wrap items-center gap-2">{bulkActions}</div>
        {onClearSelection ? (
          <Button
            variant="ghost"
            size="sm"
            iconStart={<X />}
            onClick={onClearSelection}
            className="ms-auto"
          >
            {clearSelectionLabel}
          </Button>
        ) : null}
      </div>
    );
  }

  return (
    <div className={cn('flex flex-wrap items-center gap-3', className)}>
      {onSearchChange ? (
        <SearchInput
          aria-label={searchLabel}
          placeholder={searchPlaceholder}
          value={search ?? ''}
          onChange={(event) => onSearchChange(event.target.value)}
          onClear={() => onSearchChange('')}
          wrapperClassName="w-full sm:w-72"
        />
      ) : null}
      {filters ? <div className="flex flex-wrap items-center gap-2">{filters}</div> : null}
      {actions ? (
        <div className="flex flex-wrap items-center gap-2 sm:ms-auto">{actions}</div>
      ) : null}
    </div>
  );
}
