'use client';

import { StepForward, StepBack } from 'lucide-react';

import { useTranslations } from 'next-intl';
import type { ReactNode } from 'react';

import { IconButton, Tooltip, useIsRtl } from '@afaq/ui';

import { useShell } from './shell-context';

export function SidebarToggle({ controls }: { controls: string }): ReactNode {
  const t = useTranslations('shell');

  const { sidebarCollapsed, toggleSidebar } = useShell();

  const rtl = useIsRtl();

  const label = sidebarCollapsed ? t('expandSidebar') : t('collapseSidebar');

  return (
    <Tooltip content={`${label} (Ctrl+B)`} placement={rtl ? 'left' : 'right'} delay={300}>
      <IconButton
        icon={
          sidebarCollapsed ? (
            <StepForward className="rtl:rotate-180" />
          ) : (
            <StepBack className="rtl:rotate-180" />
          )
        }
        label={label}
        size="sm"
        variant="ghost"
        aria-expanded={!sidebarCollapsed}
        aria-controls={controls}
        onClick={toggleSidebar}
        className="size-8 rounded-xl text-sidebar-text-muted transition-all hover:bg-sidebar-hover hover:text-sidebar-text hover:shadow-sm focus-visible:ring-sidebar-active focus-visible:ring-offset-sidebar-background"
      />
    </Tooltip>
  );
}
