import type messages from '../messages/en.json';
import type { AppLocale } from './i18n/routing';

/**
 * Makes translation keys type-checked: t('nav.investors') is verified against
 * the English file, and a typo or a missing key fails the build instead of
 * showing a raw key on screen.
 */
declare module 'next-intl' {
  interface AppConfig {
    Locale: AppLocale;
    Messages: typeof messages;
  }
}
