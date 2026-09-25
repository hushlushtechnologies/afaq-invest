import { routing } from '@/i18n/routing';

/**
 * Pages reachable without signing in.
 *
 * Kept as one list so the proxy, the layouts and any future check all agree.
 * Anything not named here needs a session.
 */
export const PUBLIC_PATHS = [
  '/login',
  '/forgot-password',
  '/reset-password',
  '/accept-invitation',
  '/auth/callback',
] as const;

/**
 * Pages that make no sense once signed in — someone with a session is sent to
 * the portal instead. Password reset is excluded on purpose: changing a
 * password while signed in is perfectly normal.
 */
export const SIGNED_IN_REDIRECT_PATHS = ['/login', '/forgot-password'] as const;

/** Strips the /en or /ar prefix, so paths can be compared as written above. */
export function stripLocale(pathname: string): string {
  for (const locale of routing.locales) {
    if (pathname === `/${locale}`) return '/';
    if (pathname.startsWith(`/${locale}/`)) return pathname.slice(locale.length + 1);
  }
  return pathname;
}

export function localeFromPath(pathname: string): string {
  for (const locale of routing.locales) {
    if (pathname === `/${locale}` || pathname.startsWith(`/${locale}/`)) return locale;
  }
  return routing.defaultLocale;
}

function matches(path: string, list: readonly string[]): boolean {
  return list.some((entry) => path === entry || path.startsWith(`${entry}/`));
}

export function isPublicPath(pathWithoutLocale: string): boolean {
  return matches(pathWithoutLocale, PUBLIC_PATHS);
}

export function isSignedInRedirectPath(pathWithoutLocale: string): boolean {
  return matches(pathWithoutLocale, SIGNED_IN_REDIRECT_PATHS);
}
