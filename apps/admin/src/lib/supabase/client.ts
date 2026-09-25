import { createBrowserClient } from '@supabase/ssr';
import type { SupabaseClient } from '@supabase/supabase-js';
import { getSupabasePublicEnv } from './env';

/**
 * The browser's Supabase client.
 *
 * Created once and reused: a second client would start its own token refresh
 * timer and its own auth listeners, which leads to the two disagreeing about
 * who is signed in.
 */
let browserClient: SupabaseClient | undefined;

export function createClient(): SupabaseClient {
  if (!browserClient) {
    const { url, publishableKey } = getSupabasePublicEnv();
    browserClient = createBrowserClient(url, publishableKey);
  }

  return browserClient;
}
