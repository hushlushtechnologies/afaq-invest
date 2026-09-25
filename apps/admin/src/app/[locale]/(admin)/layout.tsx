import type { ReactNode } from 'react';
import { cookies } from 'next/headers';
import { AdminShell } from '@/components/shell/admin-shell';
import { getEnvironment } from '@/config/app-meta';
import type { AppLocale } from '@/i18n/routing';
import { requireAuthUser } from '@/lib/auth/server';
import { isCollapsed, SIDEBAR_COOKIE } from '@/lib/shell/sidebar-preference';

/**
 * The signed-in Admin Portal: sidebar, topbar and content area.
 *
 * Everything inside this group sits behind the shell. Authentication pages
 * live in the (auth) group instead, which has no shell at all.
 */
export default async function AdminGroupLayout({
  children,
  params,
}: Readonly<{ children: ReactNode; params: Promise<{ locale: string }> }>): Promise<ReactNode> {
  const { locale } = await params;

  // Checked here as well as in the proxy: a page must never render its
  // contents for someone without a session, whatever happened upstream.
  await requireAuthUser(locale as AppLocale);

  // Reading the sidebar choice here means the very first HTML has the right
  // width — no flash of an expanded sidebar collapsing a moment later.
  const cookieStore = await cookies();
  const sidebarCollapsed = isCollapsed(cookieStore.get(SIDEBAR_COOKIE)?.value);

  return (
    <AdminShell initialSidebarCollapsed={sidebarCollapsed} environment={getEnvironment()}>
      {children}
    </AdminShell>
  );
}
