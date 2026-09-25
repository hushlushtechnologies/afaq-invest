'use client';

import type { Session, User } from '@supabase/supabase-js';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { createClient } from '@/lib/supabase/client';

export type AuthStatus = 'loading' | 'authenticated' | 'unauthenticated';

export interface AuthContextValue {
  status: AuthStatus;
  session: Session | null;
  user: User | null;
  /** The Supabase access token, refreshed if it is close to expiring. */
  getAccessToken: () => Promise<string | null>;
  /** Ends the session. `scope` decides which devices are signed out. */
  signOut: (scope?: 'local' | 'global' | 'others') => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used inside <AuthProvider>.');
  return context;
}

export interface AuthProviderProps {
  children: ReactNode;
  /**
   * The session read on the server during rendering. Passing it in means the
   * first paint already knows who is signed in — no flash of a signed-out
   * screen before the browser catches up.
   */
  initialSession: Session | null;
}

export function AuthProvider({ children, initialSession }: AuthProviderProps): ReactNode {
  const supabase = createClient();
  const [session, setSession] = useState<Session | null>(initialSession);
  const [resolved, setResolved] = useState(false);

  useEffect(() => {
    let active = true;

    // Confirm with Supabase itself: the server-rendered session could have
    // expired between rendering and the page becoming interactive.
    void supabase.auth.getSession().then(({ data }) => {
      if (!active) return;
      setSession(data.session);
      setResolved(true);
    });

    // Fires on sign-in, sign-out, token refresh, and when another tab signs
    // out — so every tab agrees on who is signed in.
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      if (!active) return;
      setSession(nextSession);
      setResolved(true);
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, [supabase]);

  const getAccessToken = useCallback(async () => {
    const { data } = await supabase.auth.getSession();
    return data.session?.access_token ?? null;
  }, [supabase]);

  const signOut = useCallback(
    async (scope: 'local' | 'global' | 'others' = 'local') => {
      await supabase.auth.signOut({ scope });
      if (scope !== 'others') setSession(null);
    },
    [supabase],
  );

  const value = useMemo<AuthContextValue>(
    () => ({
      status:
        !resolved && !initialSession ? 'loading' : session ? 'authenticated' : 'unauthenticated',
      session,
      user: session?.user ?? null,
      getAccessToken,
      signOut,
    }),
    [resolved, initialSession, session, getAccessToken, signOut],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
