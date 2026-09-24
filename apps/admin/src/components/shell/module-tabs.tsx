'use client';

import { useTranslations } from 'next-intl';
import type { ReactNode } from 'react';
import { LinkTabs } from '@afaq/ui';
import { findActiveSection, sectionsFor } from '@/config/module-tabs';
import type { NavModule } from '@/config/navigation';
import { Link, usePathname } from '@/i18n/navigation';

export interface ModuleTabsProps {
  module: NavModule['key'];
  /** Counts beside section names, e.g. 3 distributions awaiting approval. */
  counts?: Record<string, number>;
}

/**
 * The section tabs inside a module. They are links, not buttons: each section
 * has its own address, so the back button and bookmarks behave as people expect.
 */
export function ModuleTabs({ module, counts }: ModuleTabsProps): ReactNode {
  const t = useTranslations('moduleTabs');
  const tNav = useTranslations('nav');
  const pathname = usePathname();
  const sections = sectionsFor(module);

  if (sections.length === 0) return null;

  const active = findActiveSection(module, pathname);

  return (
    <LinkTabs
      label={t('sectionsOf', { module: tNav(module) })}
      activeHref={active?.href ?? sections[0]!.href}
      linkComponent={Link}
      items={sections.map((section) => ({
        href: section.href,
        label: t(`${module}.${section.key}` as never),
        count: counts?.[section.key],
      }))}
    />
  );
}
