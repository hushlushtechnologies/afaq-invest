'use client';

import { motion } from 'framer-motion';
import { useTranslations } from 'next-intl';
import type { ReactNode } from 'react';

import { cn } from '@afaq/utils';

import type { AppEnvironment } from '@/lib/env';

import { useShell } from './shell-context';
import { SidebarFooter } from './sidebar-footer';
import { SidebarHeader } from './sidebar-header';
import { SidebarNav } from './sidebar-nav';

const NAV_REGION_ID = 'sidebar-navigation';

export function Sidebar({ environment }: { environment: AppEnvironment }): ReactNode {
  const t = useTranslations('navGroups');

  const { sidebarCollapsed } = useShell();

  return (
    <motion.aside
      initial={false}
      animate={{
        width: sidebarCollapsed ? 76 : 264,
      }}
      transition={{
        duration: 0.32,
        ease: [0.22, 1, 0.36, 1],
      }}
      aria-label={t('modules')}
      data-state={sidebarCollapsed ? 'collapsed' : 'expanded'}
      className={cn(
        'relative hidden h-[calc(100dvh-1.5rem)] shrink-0 lg:flex',
        'm-3 flex-col',
        'overflow-hidden',
        'rounded-3xl',
        'border border-sidebar-border/80',
        'bg-sidebar-background/95',
        'shadow-[0_18px_50px_-20px_oklch(0_0_0/0.55)]',
        'backdrop-blur-xl',
      )}
    >
      {/* Ambient glow */}
      <div
        aria-hidden="true"
        className={cn(
          'pointer-events-none absolute -inset-s-24 -top-24',
          'size-52 rounded-full',
          'bg-sidebar-active/10 blur-3xl',
        )}
      />

      <div
        aria-hidden="true"
        className={cn(
          'pointer-events-none absolute -inset-e-24 -bottom-24',
          'size-52 rounded-full',
          'bg-primary/5 blur-3xl',
        )}
      />

      <div className="relative z-10 flex min-h-0 flex-1 flex-col">
        <SidebarHeader
          collapsed={sidebarCollapsed}
          environment={environment}
          controls={NAV_REGION_ID}
        />

        <div
          id={NAV_REGION_ID}
          className={cn(
            'min-h-0 flex-1 overflow-y-auto',
            'scrollbar-sidebar',
            'overscroll-contain',
            'px-2',
          )}
        >
          <SidebarNav collapsed={sidebarCollapsed} />
        </div>

        <SidebarFooter collapsed={sidebarCollapsed} />
      </div>
    </motion.aside>
  );
}
