'use client';

import { useRef, type ReactNode } from 'react';

import { OfflineBanner, PageTransition } from '@afaq/ui';

import { SearchDialog } from '@/components/search/search-dialog';
import type { AppEnvironment } from '@/lib/env';
import { usePathname } from '@/i18n/navigation';
import { useScrollRestoration } from '@/lib/shell/use-scroll-restoration';

import { MobileNav } from './mobile-nav';
import { Sidebar } from './sidebar';
import { ShellProvider, useShell } from './shell-context';
import { SkipLink } from './skip-link';
import { NotificationsProvider } from '@/lib/notification/notifications-context';
import { Topbar } from './topbar';

const CONTENT_ID = 'main-content';

export interface AdminShellProps {
  children: ReactNode;
  initialSidebarCollapsed: boolean;
  environment: AppEnvironment;
}

export function AdminShell({
  children,
  initialSidebarCollapsed,
  environment,
}: AdminShellProps): ReactNode {
  const pathname = usePathname();

  return (
    <ShellProvider initialSidebarCollapsed={initialSidebarCollapsed}>
      <NotificationsProvider>
        <ShellBody environment={environment} pathname={pathname}>
          {children}
        </ShellBody>
      </NotificationsProvider>
    </ShellProvider>
  );
}

function ShellBody({
  children,
  environment,
  pathname,
}: {
  children: ReactNode;
  environment: AppEnvironment;
  pathname: string;
}): ReactNode {
  const { searchOpen, setSearchOpen } = useShell();

  const contentRef = useRef<HTMLElement>(null);

  useScrollRestoration(contentRef, pathname);

  return (
    <>
      <div className="flex h-dvh overflow-hidden bg-background">
        <SkipLink targetId={CONTENT_ID} />

        <Sidebar environment={environment} />

        <MobileNav />

        <div className="flex min-h-0 min-w-0 flex-1 flex-col">
          <Topbar />

          <main
            ref={contentRef}
            id={CONTENT_ID}
            tabIndex={-1}
            className="scrollbar-subtle min-h-0 min-w-0 flex-1 scroll-smooth-region overflow-y-auto outline-none"
          >
            <PageTransition routeKey={pathname}>{children}</PageTransition>
          </main>
        </div>

        <OfflineBanner />
      </div>

      <SearchDialog open={searchOpen} onClose={() => setSearchOpen(false)} />
    </>
  );
}
