import { createServerClient } from '@supabase/ssr';
import type { User } from '@supabase/supabase-js';
import type { NextRequest, NextResponse } from 'next/server';
import { getSupabasePublicEnv } from './env';

export interface RefreshResult {
  response: NextResponse;
  /** Null when nobody is signed in, or when the session has expired. */
  user: User | null;
}

/**
 * Refreshes the Supabase session cookie and reports who the request belongs to.
 *
 * Called from src/proxy.ts on every page request. `getUser()` rather than
 * `getSession()`: it verifies the token with Supabase, so an expired or
 * tampered cookie resolves to nobody rather than to a trusted-looking user.
 */
export async function refreshSession(
  request: NextRequest,
  response: NextResponse,
): Promise<RefreshResult> {
  const { url, publishableKey } = getSupabasePublicEnv();

  const supabase = createServerClient(url, publishableKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) => {
          response.cookies.set(name, value, options);
        });
      },
    },
  });

  const { data, error } = await supabase.auth.getUser();

  return { response, user: error ? null : data.user };
}
