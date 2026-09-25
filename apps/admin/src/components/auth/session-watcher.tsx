'use client';

import { useEffect, type ReactNode } from 'react';
import { usePathname, useRouter } from '@/i18n/navigation';
import { useAuth } from '@/lib/auth/auth-context';

/**
 * Sends people to the login page the moment their session ends.
 *
 * Sessions expire, and signing out in one tab must sign out the others. The
 * proxy only sees the next request, so without this a tab left open overnight
 * would sit on an admin page that can no longer load anything.
 *
 * The address is remembered, so signing in again returns them to the page
 * they were on.
 */
export function SessionWatcher(): ReactNode {
  const { status } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (status !== 'unauthenticated') return;

    const query =
      pathname && pathname !== '/dashboard' ? `?next=${encodeURIComponent(pathname)}` : '';
    router.replace(`/login${query}`);
    // Throw away the cached server-rendered pages, so Back cannot show an
    // admin screen that was rendered while the session was still valid.
    router.refresh();
  }, [status, pathname, router]);

  return null;
}
