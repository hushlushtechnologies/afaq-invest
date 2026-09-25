'use client';

import { useQueryClient } from '@tanstack/react-query';
import { useCallback, useState } from 'react';
import { useRouter } from '@/i18n/navigation';
import { getApiClient } from '@/lib/api';
import { useAuth } from './auth-context';

export type SignOutScope = 'local' | 'global' | 'others';

/**
 * Ends a session and returns to the login page.
 *
 * `local`  this device only
 * `others` every other device, leaving this one signed in
 * `global` everywhere, including here
 *
 * Three things have to happen in order: the API forgets its cached copy of
 * the token (while the token still works), Supabase ends the session, and the
 * cached pages and query data are thrown away — so pressing Back cannot show
 * an admin screen rendered while signed in.
 */
export function useSignOut(): {
  signOut: (scope?: SignOutScope) => Promise<void>;
  pending: boolean;
} {
  const { signOut: endSession } = useAuth();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [pending, setPending] = useState(false);

  const signOut = useCallback(
    async (scope: SignOutScope = 'local') => {
      setPending(true);

      try {
        if (scope !== 'others') {
          // Best effort, and deliberately first: after Supabase ends the
          // session there is no longer a token to present.
          await getApiClient()
            .post('/auth/sign-out', {})
            .catch(() => undefined);
        }

        await endSession(scope);

        if (scope !== 'others') {
          queryClient.clear();
          router.replace('/login');
          router.refresh();
        }
      } finally {
        setPending(false);
      }
    },
    [endSession, queryClient, router],
  );

  return { signOut, pending };
}
