import type { Session, User } from '@supabase/supabase-js';
import { redirect } from '@/i18n/navigation';
import { cache } from 'react';
import type { AppLocale } from '@/i18n/routing';
import { createClient } from '@/lib/supabase/server';

/**
 * The signed-in identity, read on the server while a page renders.
 *
 * `getUser()` rather than `getSession()`: getUser checks the token with
 * Supabase, while a session read from a cookie is only as trustworthy as the
 * cookie. Anything that decides access uses this.
 */
export const getAuthUser = cache(async (): Promise<User | null> => {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getUser();

  if (error) return null;
  return data.user;
});

/**
 * The session for handing to the client provider, so the first paint already
 * knows who is signed in. Pair it with getAuthUser() for decisions.
 */
export const getServerSession = cache(async (): Promise<Session | null> => {
  const supabase = await createClient();
  const { data } = await supabase.auth.getSession();
  return data.session;
});

/**
 * The signed-in identity, or a redirect to the login page.
 *
 * The proxy already turns anonymous visitors away, but a layout that trusts
 * only the proxy is one configuration mistake away from serving admin pages
 * to nobody in particular. This is the second lock on the same door.
 */
export async function requireAuthUser(locale: AppLocale, intendedPath?: string): Promise<User> {
  const user = await getAuthUser();

  if (!user) {
    const query = intendedPath ? `?next=${encodeURIComponent(intendedPath)}` : '';
    // redirect() throws to unwind rendering, so nothing below it runs. Its
    // type does not say so, hence the explicit stop.
    redirect({ href: `/login${query}`, locale });
    throw new Error('Unreachable: redirect always throws.');
  }

  return user;
}
