import { ChevronLeft, ChevronRight } from 'lucide-react';
import type { ReactNode } from 'react';
import { cn } from '@afaq/utils';

type PageToken = number | 'gap';

/**
 * Which page numbers to show. Always the first and last page, a window around
 * the current one, and a gap marker where pages are skipped — keeping the row
 * the same length wherever you are, so the buttons don't jump around.
 * pageRange(10, 20) → [1, 'gap', 9, 10, 11, 'gap', 20]
 * pageRange(2, 20)  → [1, 2, 3, 4, 5, 'gap', 20]
 */
export function pageRange(current: number, total: number, siblings = 1): PageToken[] {
  const slots = siblings * 2 + 5;
  if (total <= slots) return Array.from({ length: total }, (_, index) => index + 1);

  const left = Math.max(current - siblings, 1);
  const right = Math.min(current + siblings, total);
  // A gap must hide at least two pages — hiding just one would take the same space.
  const leftGap = left > 3;
  const rightGap = right < total - 2;
  const edgeCount = siblings * 2 + 3;

  if (!leftGap && rightGap) {
    return [...Array.from({ length: edgeCount }, (_, index) => index + 1), 'gap', total];
  }
  if (leftGap && !rightGap) {
    return [
      1,
      'gap',
      ...Array.from({ length: edgeCount }, (_, index) => total - edgeCount + index + 1),
    ];
  }
  return [
    1,
    'gap',
    ...Array.from({ length: right - left + 1 }, (_, index) => left + index),
    'gap',
    total,
  ];
}

export interface PaginationLabels {
  previous: string;
  next: string;
  page: (page: number) => string;
  /** "Page 3 of 25" on narrow screens. */
  pageOf: (page: number, total: number) => string;
  /** "Showing 21–30 of 245". */
  showing: (from: number, to: number, total: number) => string;
}

const DEFAULT_LABELS: PaginationLabels = {
  previous: 'Previous page',
  next: 'Next page',
  page: (page) => `Page ${page}`,
  pageOf: (page, total) => `Page ${page} of ${total}`,
  showing: (from, to, total) => `Showing ${from}–${to} of ${total}`,
};

export interface PaginationProps {
  page: number;
  pageCount: number;
  onPageChange: (page: number) => void;
  /** With totalItems and pageSize, shows "Showing 21–30 of 245". */
  totalItems?: number;
  pageSize?: number;
  labels?: Partial<PaginationLabels>;
  className?: string;
}

const PAGE_BUTTON = cn(
  'inline-flex h-8 min-w-8 items-center justify-center rounded-lg px-2 text-body-small outline-none',
  'transition-colors duration-150 focus-visible:ring-2 focus-visible:ring-ring',
  'disabled:pointer-events-none disabled:opacity-40',
);

export function Pagination({
  page,
  pageCount,
  onPageChange,
  totalItems,
  pageSize,
  labels,
  className,
}: PaginationProps): ReactNode {
  const text = { ...DEFAULT_LABELS, ...labels };
  const total = Math.max(1, pageCount);
  const current = Math.min(Math.max(1, page), total);

  const showSummary = totalItems !== undefined && pageSize !== undefined;
  const from = showSummary ? Math.min((current - 1) * pageSize + 1, totalItems) : 0;
  const to = showSummary ? Math.min(current * pageSize, totalItems) : 0;

  return (
    <div className={cn('flex flex-wrap items-center justify-between gap-3', className)}>
      {showSummary ? (
        <p className="text-caption text-fg-muted" aria-live="polite">
          {text.showing(from, to, totalItems)}
        </p>
      ) : (
        <span />
      )}

      <nav aria-label="Pagination" className="flex items-center gap-1">
        <button
          type="button"
          className={cn(PAGE_BUTTON, 'text-fg-secondary hover:bg-surface-hover')}
          onClick={() => onPageChange(current - 1)}
          disabled={current <= 1}
          aria-label={text.previous}
        >
          <ChevronLeft className="size-4 rtl:rotate-180" aria-hidden="true" />
        </button>

        {/* Narrow screens: "Page 3 of 25" instead of a row of numbers. */}
        <span className="px-2 text-caption text-fg-secondary sm:hidden">
          {text.pageOf(current, total)}
        </span>

        <ul className="hidden items-center gap-1 sm:flex">
          {pageRange(current, total).map((token, index) =>
            token === 'gap' ? (
              <li key={`gap-${index}`} className="px-1 text-fg-muted" aria-hidden="true">
                …
              </li>
            ) : (
              <li key={token}>
                <button
                  type="button"
                  onClick={() => onPageChange(token)}
                  aria-label={text.page(token)}
                  aria-current={token === current ? 'page' : undefined}
                  className={cn(
                    PAGE_BUTTON,
                    'text-numeric',
                    token === current
                      ? 'bg-primary font-medium text-primary-foreground'
                      : 'text-fg-secondary hover:bg-surface-hover',
                  )}
                >
                  {token}
                </button>
              </li>
            ),
          )}
        </ul>

        <button
          type="button"
          className={cn(PAGE_BUTTON, 'text-fg-secondary hover:bg-surface-hover')}
          onClick={() => onPageChange(current + 1)}
          disabled={current >= total}
          aria-label={text.next}
        >
          <ChevronRight className="size-4 rtl:rotate-180" aria-hidden="true" />
        </button>
      </nav>
    </div>
  );
}
