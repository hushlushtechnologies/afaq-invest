'use client';

import { LayoutGroup } from 'framer-motion';
import { useTranslations } from 'next-intl';
import { useId, type ReactNode } from 'react';

import { NavGroup, NavItem } from '@afaq/ui';

import { NAV_GROUPS, findActiveModule } from '@/config/navigation';

import { Link, usePathname } from '@/i18n/navigation';
import { useNavBadges } from '@/lib/navigation/use-nav-badges';

export interface SidebarNavProps {
  onNavigate?: () => void;
  collapsed?: boolean;
  touchTargets?: boolean;
}

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

  const groupId = useId();

  return (
    <nav aria-label={tg('modules')} className="flex flex-col gap-2 px-1 pb-3">
      <LayoutGroup id={groupId}>
        {NAV_GROUPS.map((group) => (
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
