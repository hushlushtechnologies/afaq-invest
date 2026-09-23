'use client';

import { X } from 'lucide-react';
import type { ReactNode } from 'react';
import { cn } from '@afaq/utils';

export interface ActiveFilter {
  id: string;
  /** e.g. "Status" */
  label: string;
  /** e.g. "Active" */
  value: string;
}

export interface FilterBarProps {
  filters: readonly ActiveFilter[];
  onRemove: (id: string) => void;
  onClearAll?: () => void;
  clearAllLabel?: string;
  removeLabel?: (filter: ActiveFilter) => string;
  className?: string;
}

/** Shows the filters currently applied, each removable, so nobody wonders why rows are missing. */
export function FilterBar({
  filters,
  onRemove,
  onClearAll,
  clearAllLabel = 'Clear all',
  removeLabel = (filter) => `Remove filter ${filter.label}: ${filter.value}`,
  className,
}: FilterBarProps): ReactNode {
  if (filters.length === 0) return null;

  return (
    <div className={cn('flex flex-wrap items-center gap-2', className)}>
      {filters.map((filter) => (
        <span
          key={filter.id}
          className="inline-flex h-7 items-center gap-1.5 rounded-full border border-border bg-surface ps-3 pe-1 text-caption"
        >
          <span className="text-fg-muted">{filter.label}:</span>
          <span className="font-medium text-fg">{filter.value}</span>
          <button
            type="button"
            onClick={() => onRemove(filter.id)}
            aria-label={removeLabel(filter)}
            className="flex size-5 items-center justify-center rounded-full text-fg-muted outline-none hover:bg-surface-hover hover:text-fg focus-visible:ring-2 focus-visible:ring-ring"
          >
            <X className="size-3" aria-hidden="true" />
          </button>
        </span>
      ))}
      {onClearAll && filters.length > 1 ? (
        <button
          type="button"
          onClick={onClearAll}
          className="rounded px-1 text-caption font-medium text-primary-strong outline-none hover:underline focus-visible:ring-2 focus-visible:ring-ring"
        >
          {clearAllLabel}
        </button>
      ) : null}
    </div>
  );
}
