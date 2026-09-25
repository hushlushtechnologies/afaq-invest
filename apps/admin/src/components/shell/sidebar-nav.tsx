'use client';

import { LayoutGroup } from 'framer-motion';
import { useTranslations } from 'next-intl';
import { useId, type ReactNode } from 'react';
import { NavGroup, NavItem, Skeleton } from '@afaq/ui';
import { findActiveModule } from '@/config/navigation';
import { Link, usePathname } from '@/i18n/navigation';
import { useNavBadges } from '@/lib/navigation/use-nav-badges';
import { useVisibleNav } from '@/lib/navigation/use-visible-nav';

export interface SidebarNavProps {
  /** Closes the mobile drawer after a link is followed. */
  onNavigate?: () => void;
  /** Icon-only rail on desktop. */
  collapsed?: boolean;
  /** Taller rows for fingers — used in the mobile drawer. */
  touchTargets?: boolean;
}

/** The list of modules, shared by the desktop sidebar and the mobile drawer. */
export function SidebarNav({
  onNavigate,
  collapsed = false,
  touchTargets = false,
}: SidebarNavProps): ReactNode {
  const t = useTranslations('nav');
  const tg = useTranslations('navGroups');
  const pathname = usePathname();
  const badges = useNavBadges();
  const active = findActiveModule(pathname);
  const { groups, loading } = useVisibleNav();
  // Its own group, so the desktop sidebar and the mobile drawer each animate
  // their own indicator instead of fighting over a shared one.
  const groupId = useId();

  return (
    <nav aria-label={tg('modules')} className="flex flex-col gap-1 px-3 pb-4">
      <LayoutGroup id={groupId}>
        {/* Placeholder rows while permissions load. Rendering the full nav and
            then removing items would show somebody modules they cannot open;
            rendering nothing makes the sidebar jump. */}
        {loading
          ? Array.from({ length: 6 }, (_, index) => (
              <Skeleton key={index} className={touchTargets ? 'h-11' : 'h-9'} />
            ))
          : null}

        {groups.map((group) => (
          <NavGroup
            key={group.key}
            variant="sidebar"
            collapsed={collapsed}
            title={group.showTitle ? tg(group.key) : undefined}
          >
            {group.items.map((module) => (
              <NavItem
                key={module.key}
                variant="sidebar"
                collapsed={collapsed}
                href={module.href}
                label={t(module.key)}
                icon={<module.icon />}
                badge={badges[module.key]}
                active={active?.key === module.key}
                withIndicator
                linkComponent={Link}
                onClick={onNavigate}
                // 44px rows on touch screens — the minimum comfortable tap size.
                className={touchTargets ? 'h-11' : undefined}
              />
            ))}
          </NavGroup>
        ))}
      </LayoutGroup>
    </nav>
  );
}
