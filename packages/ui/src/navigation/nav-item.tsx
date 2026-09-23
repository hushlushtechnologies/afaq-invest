'use client';

import type { ElementType, ReactNode } from 'react';
import { cn } from '@afaq/utils';
import { Tooltip } from '../overlay/tooltip';

export interface NavItemProps {
  href: string;
  label: string;
  icon?: ReactNode;
  active?: boolean;
  /** A count, e.g. items waiting for review. */
  badge?: number;
  /** Icon only, with the label in a tooltip — for the collapsed sidebar. */
  collapsed?: boolean;
  /** 'sidebar' for the always-dark sidebar, 'default' on normal surfaces. */
  variant?: 'sidebar' | 'default';
  /** Pass the app's locale-aware Link. Defaults to a plain <a>. */
  linkComponent?: ElementType;
  className?: string;
}

export function NavItem({
  href,
  label,
  icon,
  active = false,
  badge,
  collapsed = false,
  variant = 'default',
  linkComponent: LinkComponent = 'a',
  className,
}: NavItemProps): ReactNode {
  const sidebar = variant === 'sidebar';

  const link = (
    <LinkComponent
      href={href}
      aria-current={active ? 'page' : undefined}
      // When collapsed the text is hidden, so the link needs its name spelled out.
      aria-label={collapsed ? label : undefined}
      className={cn(
        'group relative flex items-center gap-3 rounded-lg text-body-small outline-none',
        'transition-colors duration-150 [&_svg]:size-4.5 [&_svg]:shrink-0',
        'focus-visible:ring-2 focus-visible:ring-offset-2',
        collapsed ? 'size-10 justify-center' : 'h-9.5 px-3',
        sidebar
          ? cn(
              'focus-visible:ring-sidebar-active focus-visible:ring-offset-sidebar-background',
              active
                ? 'gradient-ghost font-medium text-sidebar-active'
                : 'text-sidebar-text-muted hover:bg-sidebar-hover hover:text-sidebar-text',
            )
          : cn(
              'focus-visible:ring-ring focus-visible:ring-offset-background',
              active
                ? 'bg-primary/10 font-medium text-primary-strong'
                : 'text-fg-subtle hover:bg-surface-hover hover:text-fg',
            ),
        className,
      )}
    >
      {icon}
      {!collapsed ? <span className="min-w-0 flex-1 truncate">{label}</span> : null}
      {badge !== undefined && badge > 0 ? (
        collapsed ? (
          <span
            aria-hidden="true"
            className="absolute end-1.5 top-1.5 size-2 rounded-full bg-accent ring-2 ring-sidebar-background"
          />
        ) : (
          <span
            className={cn(
              'min-w-5 rounded-full px-1.5 text-center text-[0.6875rem] leading-5 text-numeric',
              sidebar ? 'bg-accent/20 text-accent' : 'bg-primary/12 text-primary-strong',
            )}
          >
            {badge}
          </span>
        )
      ) : null}
    </LinkComponent>
  );

  // Collapsed items show their label in a tooltip on hover and keyboard focus.
  if (collapsed) {
    return (
      <Tooltip placement="right" content={badge ? `${label} (${badge})` : label} delay={150}>
        {link}
      </Tooltip>
    );
  }

  return link;
}
