'use client';

import { LayoutGroup } from 'framer-motion';
import { useTranslations } from 'next-intl';
import { useId, type ReactNode } from 'react';
import { LinkTabs, NavItem } from '@afaq/ui';
import { SETTINGS_SECTIONS, findSettingsSection } from '@/config/settings-nav';
import { Link, usePathname } from '@/i18n/navigation';

/**
 * Settings navigation. A vertical list beside the content on desktop, where
 * there is room; a scrolling row of tabs on narrow screens, where a vertical
 * list would push the content off the bottom of the page.
 */
export function SettingsNav(): ReactNode {
  const t = useTranslations('settings');
  const pathname = usePathname();
  const groupId = useId();
  const active = findSettingsSection(pathname);
  const activeHref = active?.href ?? SETTINGS_SECTIONS[0]!.href;

  return (
    <>
      <nav aria-label={t('title')} className="hidden lg:block">
        <LayoutGroup id={groupId}>
          <ul className="flex flex-col gap-1">
            {SETTINGS_SECTIONS.map((section) => (
              <li key={section.key}>
                <NavItem
                  href={section.href}
                  label={t(`sections.${section.key}.title`)}
                  icon={<section.icon />}
                  active={section.href === activeHref}
                  withIndicator
                  linkComponent={Link}
                />
              </li>
            ))}
          </ul>
        </LayoutGroup>
      </nav>

      <LinkTabs
        className="lg:hidden"
        label={t('title')}
        activeHref={activeHref}
        linkComponent={Link}
        items={SETTINGS_SECTIONS.map((section) => ({
          href: section.href,
          label: t(`sections.${section.key}.title`),
          icon: <section.icon />,
        }))}
      />
    </>
  );
}
