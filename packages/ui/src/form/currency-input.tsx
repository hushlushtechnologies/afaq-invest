'use client';

import { useState, type ChangeEvent, type FocusEvent, type ReactNode } from 'react';
import { cn } from '@afaq/utils';
import { Input, type InputProps } from './input';

export interface CurrencyInputProps extends Omit<
  InputProps,
  'type' | 'value' | 'defaultValue' | 'onChange' | 'suffix'
> {
  /** The amount as a number, or null when empty. */
  value?: number | null;
  onValueChange?: (value: number | null) => void;
  currency?: string;
  /** Number formatting locale, e.g. 'en-AE'. */
  locale?: string;
  /** Where the currency code sits. */
  currencyPosition?: 'start' | 'end';
  /** Decimal places allowed and shown. */
  decimals?: number;
}

function formatAmount(value: number, locale: string, decimals: number): string {
  return new Intl.NumberFormat(locale, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value);
}

/** Keeps digits and a single decimal point, limited to `decimals` places. */
function sanitize(raw: string, decimals: number): string {
  const digitsAndDot = raw.replace(/[^\d.]/g, '');
  const [whole = '', ...rest] = digitsAndDot.split('.');
  if (rest.length === 0 || decimals === 0) return whole;
  return `${whole}.${rest.join('').slice(0, decimals)}`;
}

function toNumber(text: string): number | null {
  if (text === '' || text === '.') return null;
  const parsed = Number(text);
  return Number.isFinite(parsed) ? parsed : null;
}

/**
 * Money input. Shows grouped figures (1,250,000.00) while idle and plain
 * digits while typing, and always reports a number — never a string.
 */
export function CurrencyInput({
  value,
  onValueChange,
  currency = 'AED',
  locale = 'en-AE',
  currencyPosition = 'start',
  decimals = 2,
  onFocus,
  onBlur,
  className,
  ...props
}: CurrencyInputProps): ReactNode {
  // While focused we show exactly what the person typed; otherwise the formatted value.
  const [draft, setDraft] = useState<string | null>(null);

  const display =
    draft ?? (value === null || value === undefined ? '' : formatAmount(value, locale, decimals));

  function handleChange(event: ChangeEvent<HTMLInputElement>): void {
    const clean = sanitize(event.target.value, decimals);
    setDraft(clean);
    onValueChange?.(toNumber(clean));
  }

  function handleFocus(event: FocusEvent<HTMLInputElement>): void {
    setDraft(value === null || value === undefined ? '' : String(value));
    onFocus?.(event);
  }

  function handleBlur(event: FocusEvent<HTMLInputElement>): void {
    setDraft(null);
    onBlur?.(event);
  }

  const badge = <span className="text-caption font-medium text-fg-muted">{currency}</span>;

  return (
    <Input
      type="text"
      inputMode="decimal"
      autoComplete="off"
      // Numbers read left to right even on Arabic pages.
      dir="ltr"
      value={display}
      onChange={handleChange}
      onFocus={handleFocus}
      onBlur={handleBlur}
      iconStart={currencyPosition === 'start' ? badge : undefined}
      iconEnd={currencyPosition === 'end' ? badge : undefined}
      className={cn('text-numeric', className)}
      {...props}
    />
  );
}
