'use client';

import { Menu } from 'lucide-react';
import { useTranslations } from 'next-intl';
import type { ReactNode } from 'react';

import { cn } from '@afaq/utils';
import { Divider, IconButton, ThemeToggle } from '@afaq/ui';

import { LanguageSwitcher } from '@/components/language-switcher';
import { NotificationsMenu } from '@/components/topbar/notifications-menu';
import { ProfileMenu } from '@/components/topbar/profile-menu';
import { SearchTrigger } from '@/components/topbar/search-trigger';
import { findActiveModule } from '@/config/navigation';
import { usePathname } from '@/i18n/navigation';
import { useShell } from './shell-context';

export function Topbar(): ReactNode {
  const t = useTranslations('nav');
  const ts = useTranslations('shell');
  const tTheme = useTranslations('theme');

  const pathname = usePathname();

  const { setMobileNavOpen, setSearchOpen } = useShell();

  const active = findActiveModule(pathname);

  return (
    <header className="sticky top-0 z-sticky shrink-0 px-3 pt-3 sm:px-4 lg:px-5">
      <div
        className={cn(
          'relative flex h-14 items-center gap-2',
          'rounded-2xl',
          'border border-border/60',
          'bg-background/75',
          'px-2',
          'shadow-[0_12px_40px_-24px_oklch(0_0_0_/_0.35)]',
          'backdrop-blur-xl',
          'supports-[backdrop-filter]:bg-background/60',
        )}
      >
        {/* Ambient brand glow */}
        <span
          aria-hidden="true"
          className={cn(
            'pointer-events-none absolute -start-10 -top-10',
            'size-24 rounded-full',
            'bg-primary/5 blur-3xl',
          )}
        />

        {/* Mobile menu */}
        <div className="relative lg:hidden">
          <IconButton
            icon={<Menu />}
            label={ts('openMenu')}
            variant="ghost"
            onClick={() => setMobileNavOpen(true)}
            className={cn(
              'size-10 rounded-xl',
              'text-fg-muted',
              'hover:bg-surface-hover',
              'hover:text-fg',
            )}
          />
        </div>

        {/* Page / module context */}
        <div className="relative hidden min-w-0 sm:block">
          <div
            className={cn(
              'flex h-9 items-center',
              'rounded-xl',
              'border border-border/50',
              'bg-surface/50',
              'px-3',
              'backdrop-blur-md',
            )}
          >
            <p className="max-w-40 truncate text-body-small font-medium text-fg sm:max-w-52 lg:max-w-64">
              {active ? t(active.key) : ts('adminPortal')}
            </p>
          </div>
        </div>

        {/* Mobile title */}
        <p className="relative min-w-0 flex-1 truncate px-1 text-body-small font-medium text-fg sm:hidden">
          {active ? t(active.key) : ts('adminPortal')}
        </p>

        {/* Search */}
        <div className={cn('relative flex min-w-0 items-center', 'flex-1', 'sm:ms-1', 'lg:ms-2')}>
          <div className="w-full max-w-xl">
            <SearchTrigger onOpen={() => setSearchOpen(true)} />
          </div>
        </div>

        {/* Right controls */}
        <div
          className={cn(
            'relative flex shrink-0 items-center gap-0.5',
            'rounded-xl',
            'border border-border/50',
            'bg-surface/45',
            'p-0.5',
            'backdrop-blur-md',
            'px-4 py-1 sm:gap-3',
          )}
        >
          {/* Language */}
          <span className="hidden lg:inline-flex">
            <LanguageSwitcher />
          </span>

          {/* Theme */}
          <ThemeToggle label={tTheme('toggle')} />

          {/* Notifications */}
          <NotificationsMenu />

          <Divider orientation="vertical" className="mx-0.5 hidden h-5 self-center sm:block" />

          {/* Profile */}
          <ProfileMenu />
        </div>
      </div>
    </header>
  );
}
