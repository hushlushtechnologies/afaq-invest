'use client';

import { LayoutGroup, motion } from 'framer-motion';
import { useId, type ElementType, type ReactNode } from 'react';
import { cn } from '@afaq/utils';
import { useIndicatorTransition } from '../motion/use-motion-preset';

export interface LinkTabItem {
  href: string;
  label: ReactNode;
  icon?: ReactNode;
  count?: number;
}

export interface LinkTabsProps {
  items: readonly LinkTabItem[];
  /** The href of the section currently shown. */
  activeHref: string;
  /** Describes the sections, e.g. "Finance sections". */
  label: string;
  /**
   * The link component to render — pass the app's locale-aware Link so
   * navigation stays client-side. Defaults to a plain <a>.
   */
  linkComponent?: ElementType;
  className?: string;
}

/**
 * Tabs that are links — each section has its own URL, so it can be
 * bookmarked, shared and reached with the back button.
 */
export function LinkTabs({
  items,
  activeHref,
  label,
  linkComponent: LinkComponent = 'a',
  className,
}: LinkTabsProps): ReactNode {
  const groupId = useId();
  const indicatorTransition = useIndicatorTransition();

  return (
    <nav aria-label={label} className={className}>
      <LayoutGroup id={groupId}>
        <ul className="flex max-w-full gap-1 overflow-x-auto border-b border-border [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {items.map((item) => {
            const active = item.href === activeHref;
            return (
              <li key={item.href} className="shrink-0">
                <LinkComponent
                  href={item.href}
                  aria-current={active ? 'page' : undefined}
                  className={cn(
                    'relative inline-flex items-center gap-2 rounded-t-md px-3 pt-2 pb-3 text-label whitespace-nowrap outline-none',
                    'transition-colors duration-150 [&_svg]:size-4',
                    'focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background',
                    active ? 'text-fg' : 'text-fg-subtle hover:text-fg',
                  )}
                >
                  {active ? (
                    <motion.span
                      layoutId="afaq-link-tab-indicator"
                      transition={indicatorTransition}
                      className="absolute inset-x-2 -bottom-px h-0.5 rounded-full bg-primary"
                      aria-hidden="true"
                    />
                  ) : null}
                  {item.icon}
                  {item.label}
                  {item.count !== undefined ? (
                    <span className="min-w-5 rounded-full bg-background-subtle px-1.5 text-center text-[0.6875rem] leading-5 text-numeric text-fg-muted">
                      {item.count}
                    </span>
                  ) : null}
                </LinkComponent>
              </li>
            );
          })}
        </ul>
      </LayoutGroup>
    </nav>
  );
}
