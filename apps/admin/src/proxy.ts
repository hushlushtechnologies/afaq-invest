import createMiddleware from 'next-intl/middleware';
import type { NextRequest, NextResponse } from 'next/server';
import { routing } from './i18n/routing';
import { refreshSession } from './lib/supabase/session';

/**
 * Runs before every page request (Next.js 16 renamed middleware to proxy).
 * 1. next-intl adds or validates the /en or /ar prefix.
 * 2. Supabase refreshes the auth session cookie on that response.
 */
const handleI18nRouting = createMiddleware(routing);

export default async function proxy(request: NextRequest): Promise<NextResponse> {
  const response = handleI18nRouting(request);
  return refreshSession(request, response);
}

export const config = {
  matcher: '/((?!api|_next|_vercel|.*\\..*).*)',
};
