import { defineRouting } from 'next-intl/routing';
import { DEFAULT_LOCALE, LOCALE_CODES } from '@afaq/types';

export const routing = defineRouting({
  locales: LOCALE_CODES,
  defaultLocale: DEFAULT_LOCALE,
  // Every address carries its language: /en/investors, /ar/investors.
  localePrefix: 'always',
  /**
   * Remembers the chosen language for a year. next-intl writes this cookie
   * when someone switches, and proxy.ts reads it to send them to the right
   * language next time they open the root address.
   */
  localeCookie: {
    name: 'AFAQ_LOCALE',
    maxAge: 60 * 60 * 24 * 365,
    sameSite: 'lax',
  },
});

export type AppLocale = (typeof routing.locales)[number];
