'use client';

import { useCallback, useState } from 'react';

/**
 * PLACEHOLDER — signing out.
 *
 * Sprint 3 replaces the body with Supabase's sign-out plus a redirect to the
 * sign-in page. The confirmation dialog, the pending state and the wording
 * around it are already final, so only this function changes.
 */
export function useSignOut(): { signOut: () => Promise<void>; pending: boolean } {
  const [pending, setPending] = useState(false);

  const signOut = useCallback(async () => {
    setPending(true);
    try {
      // Stands in for the real request, so the dialog's pending state is real.
      await new Promise((resolve) => setTimeout(resolve, 900));
    } finally {
      setPending(false);
    }
  }, []);

  return { signOut, pending };
}
