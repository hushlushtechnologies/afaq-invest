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
  if (!apiUrl) return null;

  try {
    const response = await fetch(`${apiUrl}/auth/me`, {
      headers: { Authorization: `Bearer ${session.access_token}` },
      // Per-person and short-lived: caching it would hand one staff member's
      // permissions to the next.
      cache: 'no-store',
    });

    if (!response.ok) return null;

    return (await response.json()) as StaffContextDto;
  } catch {
    // The API being unreachable must not take the whole page down — the
    // browser will ask again and show the refusal properly if it persists.
    return null;
  }
});
