export type Locale = 'en' | 'ar';

export type TextDirection = 'ltr' | 'rtl';

export interface LocaleMeta {
  code: Locale;
  /** Name in English, for admin screens and logs. */
  label: string;
  /** Name in its own language, for the language switcher. */
  nativeLabel: string;
  dir: TextDirection;
  /**
   * The locale used for formatting numbers, money and dates.
   * Arabic uses Western digits (-u-nu-latn) so financial figures read the
   * same in both languages and line up in tables.
   */
  intlLocale: string;
}

export const LOCALES: Record<Locale, LocaleMeta> = {
  en: { code: 'en', label: 'English', nativeLabel: 'English', dir: 'ltr', intlLocale: 'en-AE' },
  ar: {
    code: 'ar',
    label: 'Arabic',
    nativeLabel: 'العربية',
    dir: 'rtl',
    intlLocale: 'ar-AE-u-nu-latn',
  },
};

export const LOCALE_CODES: readonly Locale[] = ['en', 'ar'];

export const DEFAULT_LOCALE: Locale = 'en';

/**
 * All dates and times are shown in UAE time, whichever server renders them and
 * wherever the reader is. Without this, the server and the browser can format
 * the same date differently and React reports a hydration mismatch — and worse,
 * a payment date could read differently for two people.
 */
export const DEFAULT_TIME_ZONE = 'Asia/Dubai';

export function isLocale(value: unknown): value is Locale {
  return typeof value === 'string' && value in LOCALES;
}

export function directionOf(locale: Locale): TextDirection {
  return LOCALES[locale].dir;
}

/** The formatting locale for a language, e.g. 'ar' → 'ar-AE-u-nu-latn'. */
export function intlLocaleOf(locale: Locale): string {
  return LOCALES[locale].intlLocale;
}
