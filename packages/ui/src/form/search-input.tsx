'use client';

import { Search, X } from 'lucide-react';
import type { ReactNode } from 'react';
import { cn } from '@afaq/utils';
import { Input, type InputProps } from './input';

export interface SearchInputProps extends Omit<InputProps, 'type' | 'iconStart'> {
  /** Shows a clear (×) button while there is text. */
  onClear?: () => void;
  clearLabel?: string;
}

export function SearchInput({
  onClear,
  clearLabel = 'Clear search',
  value,
  loading,
  iconEnd,
  className,
  ...props
}: SearchInputProps): ReactNode {
  const showClear = Boolean(onClear) && Boolean(value) && !loading;

  return (
    <Input
      type="search"
      value={value}
      loading={loading}
      iconStart={<Search />}
      iconEnd={
        showClear ? (
          <button
            type="button"
            onClick={onClear}
            aria-label={clearLabel}
            title={clearLabel}
            className="rounded p-0.5 text-fg-muted transition-colors outline-none hover:text-fg-secondary focus-visible:ring-2 focus-visible:ring-ring"
          >
            <X aria-hidden="true" />
          </button>
        ) : (
          iconEnd
        )
      }
      // The browser's own clear button can't be styled, so it is hidden.
      className={cn('[&::-webkit-search-cancel-button]:appearance-none', className)}
      {...props}
    />
  );
}
