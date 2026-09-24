'use client';

import { motion } from 'framer-motion';
import type { ElementType, ReactNode } from 'react';
import { cn } from '@afaq/utils';
import { useIsRtl } from '../hooks/use-is-rtl';
import { useIndicatorTransition } from '../motion/use-motion-preset';
import { Tooltip } from '../overlay/tooltip';

/** Shared by every indicator in one LayoutGroup, so it slides between items. */
const INDICATOR_LAYOUT_ID = 'afaq-nav-indicator';

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
  /** Runs when the link is followed — e.g. closing the mobile menu. */
  onClick?: () => void;
  /**
   * Draws the sliding bar on the active item. Wrap the list in a
   * <LayoutGroup> so each navigation animates on its own.
   */
  withIndicator?: boolean;
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
  onClick,
  withIndicator = false,
  className,
}: NavItemProps): ReactNode {
  const sidebar = variant === 'sidebar';
  const rtl = useIsRtl();
  const indicatorTransition = useIndicatorTransition();

  const link = (
    <LinkComponent
      href={href}
      onClick={onClick}
      aria-current={active ? 'page' : undefined}
      // When collapsed the text is hidden, so the link needs its name spelled out.
      aria-label={collapsed ? label : undefined}
      className={cn(
        'group relative flex items-center gap-3 rounded-lg text-sm outline-none',
        'transition-[color,background-color] duration-200 ease-out-soft',
        // Icons follow the text colour and settle slightly faster than the row.
        '[&_svg]:size-4.5 [&_svg]:shrink-0 [&_svg]:transition-colors [&_svg]:duration-150',
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
      {/* The bar slides from the previous active item to this one. */}
      {withIndicator && active ? (
        <motion.span
          layoutId={INDICATOR_LAYOUT_ID}
          transition={indicatorTransition}
          aria-hidden="true"
          className={cn(
            'absolute start-0 h-5 w-0.5 rounded-e-full',
            sidebar ? 'bg-sidebar-active' : 'bg-primary',
          )}
        />
      ) : null}
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
      <Tooltip
        // Beside the sidebar: to its right in English, to its left in Arabic.
        placement={rtl ? 'left' : 'right'}
        content={badge ? `${label} (${badge})` : label}
        delay={150}
        // Clears the sidebar edge — both are dark, so an overlap would blur them together.
        gap={14}
      >
        {link}
      </Tooltip>
    );
  }

  return link;
}
