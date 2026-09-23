import { DEFAULT_TIME_ZONE, intlLocaleOf, type Locale } from '@afaq/types';

/**
 * Formatting helpers. Every one takes the current language, so money, dates
 * and numbers follow it — while keeping Western digits in both languages, so
 * figures stay comparable and line up in tables.
 */

function resolve(locale: Locale | string = 'en'): string {
  return locale === 'en' || locale === 'ar' ? intlLocaleOf(locale) : locale;
}

export interface CurrencyOptions {
  locale?: Locale | string;
  currency?: string;
  /** Drop the decimals — useful for large figures on dashboards. */
  whole?: boolean;
}

export function formatCurrency(amount: number, options: CurrencyOptions = {}): string {
  const { locale, currency = 'AED', whole = false } = options;
  return new Intl.NumberFormat(resolve(locale), {
    style: 'currency',
    currency,
    minimumFractionDigits: whole ? 0 : 2,
    maximumFractionDigits: whole ? 0 : 2,
  }).format(amount);
}

/**
 * Shortens large amounts: 48,250,000 → AED 48.3M. For dashboard tiles.
 *
 * The currency code is written separately rather than using the built-in
 * currency style: that style inserts invisible direction marks around the
 * Arabic symbol, and Node and browsers place them differently — which shows up
 * as a hydration mismatch even though both look identical on screen.
 */
export function formatCompactCurrency(
  amount: number,
  options: Omit<CurrencyOptions, 'whole'> = {},
): string {
  const { locale, currency = 'AED' } = options;
  const compact = new Intl.NumberFormat(resolve(locale), {
    notation: 'compact',
    maximumFractionDigits: 1,
  }).format(amount);
  return `${currency} ${compact}`;
}

export function formatNumber(
  value: number,
  options: { locale?: Locale | string; decimals?: number } = {},
): string {
  const { locale, decimals } = options;
  return new Intl.NumberFormat(resolve(locale), {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value);
}

/** 0.145 → 14.5% */
export function formatPercent(
  ratio: number,
  options: { locale?: Locale | string; decimals?: number } = {},
): string {
  const { locale, decimals = 1 } = options;
  return new Intl.NumberFormat(resolve(locale), {
    style: 'percent',
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(ratio);
}

export function formatDate(
  date: Date | string,
  options: {
    locale?: Locale | string;
    style?: 'short' | 'medium' | 'long';
    timeZone?: string;
  } = {},
): string {
  const { locale, style = 'medium', timeZone = DEFAULT_TIME_ZONE } = options;
  const value = typeof date === 'string' ? new Date(date) : date;
  return new Intl.DateTimeFormat(resolve(locale), { dateStyle: style, timeZone }).format(value);
}

export function formatDateTime(
  date: Date | string,
  options: { locale?: Locale | string; timeZone?: string } = {},
): string {
  const value = typeof date === 'string' ? new Date(date) : date;
  return new Intl.DateTimeFormat(resolve(options.locale), {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: options.timeZone ?? DEFAULT_TIME_ZONE,
  }).format(value);
}

/** "3 days ago" / "قبل ٣ أيام" — for activity feeds and audit logs. */
export function formatRelativeTime(
  date: Date | string,
  options: { locale?: Locale | string; now?: Date } = {},
): string {
  const value = typeof date === 'string' ? new Date(date) : date;
  const now = options.now ?? new Date();
  const seconds = Math.round((value.getTime() - now.getTime()) / 1000);

  const units: Array<[Intl.RelativeTimeFormatUnit, number]> = [
    ['year', 31_536_000],
    ['month', 2_592_000],
    ['week', 604_800],
    ['day', 86_400],
    ['hour', 3_600],
    ['minute', 60],
  ];

  const formatter = new Intl.RelativeTimeFormat(resolve(options.locale), { numeric: 'auto' });
  for (const [unit, size] of units) {
    if (Math.abs(seconds) >= size) return formatter.format(Math.round(seconds / size), unit);
  }
  return formatter.format(seconds, 'second');
}
