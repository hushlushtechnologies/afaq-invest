'use client';

import { useTranslations } from 'next-intl';
import type { ReactNode } from 'react';
import { Badge } from '@afaq/ui';
import { cn } from '@afaq/utils';
import { Logo } from '@/components/brand/logo';
import { showsEnvironmentBadge } from '@/config/app-meta';
import type { AppEnvironment } from '@/lib/env';
import { Link } from '@/i18n/navigation';
import { SidebarToggle } from './sidebar-toggle';

export interface SidebarHeaderProps {
  collapsed?: boolean;
  environment: AppEnvironment;
  /** id of the region the collapse button controls. */
  controls: string;
}

/**
 * The top of the sidebar: the brand, linking home; the collapse control; and —
 * outside production — a badge naming the environment, so nobody mistakes
 * staging for the real thing.
 */
export function SidebarHeader({
  collapsed = false,
  environment,
  controls,
}: SidebarHeaderProps): ReactNode {
  const t = useTranslations('shell');

  return (
    <div className={cn('flex flex-col gap-2 py-5', collapsed ? 'items-center px-3' : 'px-5')}>
      <div className={cn('flex w-full items-center gap-2', collapsed && 'flex-col')}>
        <Link
          href="/dashboard"
          className="min-w-0 rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-sidebar-active focus-visible:ring-offset-2 focus-visible:ring-offset-sidebar-background"
        >
          <Logo variant={collapsed ? 'mark' : 'full'} />
        </Link>
        <span className={cn(!collapsed && 'ms-auto')}>
          <SidebarToggle controls={controls} />
        </span>
      </div>
      {showsEnvironmentBadge(environment) && !collapsed ? (
        <Badge size="md" variant="warning" className="self-start">
          {t(`environment.${environment}`)}
        </Badge>
      ) : null}
    </div>
  );
}
