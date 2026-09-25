'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { Session } from '@supabase/supabase-js';
import { useState, type ReactNode } from 'react';
import { ThemeProvider } from '@afaq/ui';
import { AuthProvider } from '@/lib/auth/auth-context';

/**
 * Everything the Admin Portal needs in place before a page renders.
 *
 * Order matters: theme first so nothing flashes, then data fetching, then the
 * session — queries fired by authenticated screens need both.
 */
export function Providers({
  children,
  initialSession,
}: {
  children: ReactNode;
  initialSession: Session | null;
}): ReactNode {
  // Created once per browser tab. A client created during render would be
  // thrown away and rebuilt on every re-render, losing its cache.
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            // Staff lists and permissions change rarely; a minute of cache
            // avoids a request on every navigation.
            staleTime: 60_000,
            retry: (failureCount, error: unknown) => {
              // Never retry a refusal: 401 and 403 are answers, not failures.
              const status = (error as { statusCode?: number } | null)?.statusCode;
              if (status === 401 || status === 403) return false;
              return failureCount < 2;
            },
            refetchOnWindowFocus: false,
          },
        },
      }),
  );

  return (
    <ThemeProvider storageKey="afaq-admin-theme">
      <QueryClientProvider client={queryClient}>
        <AuthProvider initialSession={initialSession}>{children}</AuthProvider>
      </QueryClientProvider>
    </ThemeProvider>
  );
}
