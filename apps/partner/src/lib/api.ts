import { createApiClient, type ApiClient } from '@afaq/api-client';
import { getPublicEnv } from './env';
import { createClient } from './supabase/client';

/** API client that attaches the Supabase session token to every request. */
export function getApiClient(): ApiClient {
  const { apiUrl } = getPublicEnv();

  return createApiClient({
    baseUrl: apiUrl,
    getToken: async () => {
      const supabase = createClient();
      const { data } = await supabase.auth.getSession();
      return data.session?.access_token ?? null;
    },
  });
}
