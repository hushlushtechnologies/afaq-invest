import { hasLocale } from 'next-intl';
import { getRequestConfig } from 'next-intl/server';
import { DEFAULT_TIME_ZONE } from '@afaq/types';
import { routing } from './routing';

export default getRequestConfig(async ({ requestLocale }) => {
  const requested = await requestLocale;
  const locale = hasLocale(routing.locales, requested) ? requested : routing.defaultLocale;

  return {
    locale,
    // Fixed to UAE time, so the server and the browser always agree and a date
    // means the same thing for everyone reading it.
    timeZone: DEFAULT_TIME_ZONE,
    messages: (await import(`../../messages/${locale}.json`)).default,
  };
});
