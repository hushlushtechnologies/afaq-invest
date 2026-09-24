'use client';

import { useTranslations } from 'next-intl';
import { useEffect, type ReactNode } from 'react';
import { Drawer, ThemeToggle } from '@afaq/ui';
import { Logo } from '@/components/brand/logo';
import { LanguageSwitcher } from '@/components/language-switcher';
import { usePathname } from '@/i18n/navigation';
import { useShell } from './shell-context';
import { SidebarFooter } from './sidebar-footer';
import { SidebarNav } from './sidebar-nav';

/**
 * Navigation for phones and tablets. Built on the shared Drawer, so it already
 * traps focus, closes on Escape, on a backdrop tap and on the close button,
 * and stops the page behind it scrolling.
 *
 * It also carries language and theme, which the topbar hides on small screens.
 */
export function MobileNav(): ReactNode {
  const t = useTranslations('shell');
  const tTheme = useTranslations('theme');
  const pathname = usePathname();
  const { mobileNavOpen, setMobileNavOpen } = useShell();

  // Closes on any navigation — including the browser's back button, which a
  // click handler on the links alone would miss.
  useEffect(() => {
    setMobileNavOpen(false);
  }, [pathname, setMobileNavOpen]);

  return (
    <Drawer
      open={mobileNavOpen}
      onClose={() => setMobileNavOpen(false)}
      side="start"
      size="sm"
      tone="sidebar"
      title={<Logo />}
      closeLabel={t('closeMenu')}
      footer={
        <div className="w-full space-y-4">
          <div className="flex items-center justify-between gap-3">
            <span className="text-body-small text-sidebar-text-muted">{t('preferences')}</span>
            <span className="flex items-center gap-2">
              <LanguageSwitcher />
              <ThemeToggle label={tTheme('toggle')} />
            </span>
          </div>
          <SidebarFooter className="w-full border-0 p-0" />
        </div>
      }
    >
      {/* Cancels the drawer's own padding: the list manages its own. */}
      <div className="-m-5">
        <SidebarNav touchTargets onNavigate={() => setMobileNavOpen(false)} />
      </div>
    </Drawer>
  );
}
