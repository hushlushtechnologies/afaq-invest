'use client';

import type { ReactNode } from 'react';

import { cn } from '@afaq/utils';

import { SidebarPromo } from './sidebar-promo';
import { SidebarSocials } from './sidebar-socials';

export interface SidebarFooterProps {
  collapsed?: boolean;
  className?: string;
}

export function SidebarFooter({ collapsed = false, className }: SidebarFooterProps): ReactNode {
  return (
    <footer
      className={cn(
        'relative shrink-0',
        collapsed ? 'px-2 pt-2 pb-3' : 'px-3 pt-2 pb-3',
        className,
      )}
    >
      {!collapsed && (
        <div className="mb-3">
          <SidebarSocials />
        </div>
      )}

      <SidebarPromo collapsed={collapsed} />
    </footer>
  );
}
