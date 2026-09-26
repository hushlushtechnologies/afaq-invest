import { cache } from 'react';
import { headers } from 'next/headers';
import type { StaffContextDto } from '@afaq/types';
import { getServerSession } from './server';

/**
 * Who the signed-in person is, fetched on the server.
 *
 * The Admin Portal cannot draw its own navigation without this: which modules
 * exist depends on what the person may do. Asking for it in the browser means
 * the sidebar is a row of skeletons until the round trip finishes — the first
 * paint is a page nobody can use.
 *
 * Fetched here instead, so the first HTML already has the right sidebar.
 *
 * Wrapped in React's cache so several server components in one render share a
 * single request rather than each making their own.
 */
export const getServerStaffContext = cache(async (): Promise<StaffContextDto | null> => {
  // Client-side navigations carry the RSC header. The browser already holds
  // this context in its cache by then, and anything fetched here would be
  // thrown away — so fetching it would cost a round trip on every click and
  // buy nothing.
  const requestHeaders = await headers();
  if (requestHeaders.get('rsc') === '1') return null;

  const session = await getServerSession();

  if (!session?.access_token) return null;

  const apiUrl = process.env.NEXT_PUBLIC_API_URL;

  if (!apiUrl) {
    warn('NEXT_PUBLIC_API_URL is not set, so the sidebar cannot be rendered on the server.');
    return null;
  }

  try {
    const response = await fetch(`${apiUrl}/auth/me`, {
      headers: { Authorization: `Bearer ${session.access_token}` },
      // Per-person and short-lived: caching it would hand one staff member's
      // permissions to the next.
      cache: 'no-store',
    });

    if (!response.ok) {
      // 401 and 403 are ordinary answers — an expired session, a suspended
      // account — and the browser renders them properly. Anything else means
      // the request itself did not work, and returning null quietly would
      // present that to the person as "you have no permissions".
      if (response.status !== 401 && response.status !== 403) {
        warn(
          `GET ${apiUrl}/auth/me responded ${response.status} ${response.statusText}. ` +
            'Until it returns a staff context the sidebar will be empty and every ' +
            'page will refuse access. A 404 here usually means the route is not ' +
            'registered on the API.',
        );
      }

      return null;
    }

    return (await response.json()) as StaffContextDto;
  } catch (error) {
    // The API being unreachable must not take the whole page down — the
    // browser will ask again and show the refusal properly if it persists.
    warn(
      `Could not reach ${apiUrl}/auth/me: ${
        error instanceof Error ? error.message : String(error)
      }. Is the API running?`,
    );
    return null;
  }
});

/**
 * Says so when the permission context cannot be fetched.
 *
 * Silence here was expensive once: a broken /auth/me looked exactly like a
 * staff member with no roles, and there was nothing in any log to say
 * otherwise. Kept out of production output, where this would be noise on every
 * request during an incident.
 */
function warn(message: string): void {
  if (process.env.NODE_ENV === 'production') return;
  console.warn(`[staff-context] ${message}`);
}
