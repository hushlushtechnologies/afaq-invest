import createMiddleware from 'next-intl/middleware';
import { NextResponse, type NextRequest } from 'next/server';
import { routing } from './i18n/routing';
import {
  isPublicPath,
  isSignedInRedirectPath,
  localeFromPath,
  stripLocale,
} from './lib/auth/routes';
import { refreshSession } from './lib/supabase/session';

/**
 * Runs before every page request (Next.js 16 renamed middleware to proxy).
 *
 * 1. next-intl adds or validates the /en or /ar prefix.
 * 2. Supabase refreshes the session cookie and tells us who is signed in.
 * 3. Unauthenticated requests for admin pages go to the login page, carrying
 *    the address they wanted so they arrive there after signing in.
 * 4. Signed-in requests for the login page go to the portal instead.
 *
 * This is convenience and hygiene, not the security boundary: the layouts
 * check again on the server, and the API enforces every permission itself.
 */
const handleI18nRouting = createMiddleware(routing);

export default async function proxy(request: NextRequest): Promise<NextResponse> {
  const intlResponse = handleI18nRouting(request);

  // A redirect from locale routing (e.g. / → /en) should happen first; there
  // is nothing to protect until the address has settled.
  if (intlResponse.status >= 300 && intlResponse.status < 400) {
    return intlResponse;
  }

  const { response, user } = await refreshSession(request, intlResponse);

  const pathname = request.nextUrl.pathname;
  const locale = localeFromPath(pathname);
  const path = stripLocale(pathname);

  if (!user && !isPublicPath(path)) {
    const loginUrl = new URL(`/${locale}/login`, request.url);

    // Remember where they were heading, including any query string.
    const intended = `${path}${request.nextUrl.search}`;
    if (path !== '/' && path !== '/dashboard') {
      loginUrl.searchParams.set('next', intended);
    }

    const redirect = NextResponse.redirect(loginUrl);
    // Carry the refreshed cookies across, or the browser keeps a stale session.
    response.cookies.getAll().forEach((cookie) => redirect.cookies.set(cookie));
    return redirect;
  }

  if (user && isSignedInRedirectPath(path)) {
    const redirect = NextResponse.redirect(new URL(`/${locale}/dashboard`, request.url));
    response.cookies.getAll().forEach((cookie) => redirect.cookies.set(cookie));
    return redirect;
  }

  return response;
}

export const config = {
  matcher: '/((?!api|_next|_vercel|.*\\..*).*)',
};
