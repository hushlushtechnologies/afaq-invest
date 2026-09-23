'use client';

import { LayoutGroup, motion } from 'framer-motion';
import {
  createContext,
  useContext,
  useId,
  useRef,
  useState,
  type KeyboardEvent,
  type ReactNode,
} from 'react';
import { cn } from '@afaq/utils';
import { useIndicatorTransition } from '../motion/use-motion-preset';

export type TabsVariant = 'underline' | 'pills';

interface TabsContextValue {
  value: string;
  select: (value: string) => void;
  baseId: string;
  variant: TabsVariant;
}

const TabsContext = createContext<TabsContextValue | null>(null);

function useTabs(): TabsContextValue {
  const context = useContext(TabsContext);
  if (!context) throw new Error('Tab, TabList and TabPanel must be inside <Tabs>.');
  return context;
}

const tabId = (base: string, value: string): string => `${base}-tab-${value}`;
const panelId = (base: string, value: string): string => `${base}-panel-${value}`;

export interface TabsProps {
  children: ReactNode;
  /** Controlled selection. */
  value?: string;
  /** Starting selection when uncontrolled. */
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  variant?: TabsVariant;
  className?: string;
}

/**
 * Switches between panels on the same page. For tabs that change the URL
 * (module sections), use <LinkTabs> instead.
 */
export function Tabs({
  children,
  value: controlled,
  defaultValue = '',
  onValueChange,
  variant = 'underline',
  className,
}: TabsProps): ReactNode {
  const [inner, setInner] = useState(defaultValue);
  const value = controlled ?? inner;
  const baseId = useId();

  function select(next: string): void {
    if (controlled === undefined) setInner(next);
    onValueChange?.(next);
  }

  return (
    <TabsContext.Provider value={{ value, select, baseId, variant }}>
      {/* Each Tabs gets its own group, so indicators never animate between separate tab sets. */}
      <LayoutGroup id={baseId}>
        <div className={className}>{children}</div>
      </LayoutGroup>
    </TabsContext.Provider>
  );
}

export interface TabListProps {
  children: ReactNode;
  /** Describes the tabs to screen readers, e.g. "Investor sections". */
  label: string;
  className?: string;
}

export function TabList({ children, label, className }: TabListProps): ReactNode {
  const { variant } = useTabs();
  const listRef = useRef<HTMLDivElement>(null);

  // Arrow keys move between tabs and select them. In Arabic the arrows are
  // mirrored, so the right arrow still moves "backwards" in reading order.
  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>): void {
    const tabs = Array.from(
      listRef.current?.querySelectorAll<HTMLButtonElement>('[role="tab"]:not(:disabled)') ?? [],
    );
    const current = tabs.indexOf(document.activeElement as HTMLButtonElement);
    if (current === -1) return;

    const rtl = getComputedStyle(event.currentTarget).direction === 'rtl';
    const forward = rtl ? 'ArrowLeft' : 'ArrowRight';
    const backward = rtl ? 'ArrowRight' : 'ArrowLeft';

    let next = -1;
    if (event.key === forward) next = (current + 1) % tabs.length;
    else if (event.key === backward) next = (current - 1 + tabs.length) % tabs.length;
    else if (event.key === 'Home') next = 0;
    else if (event.key === 'End') next = tabs.length - 1;
    if (next === -1) return;

    event.preventDefault();
    tabs[next]?.focus();
    tabs[next]?.click();
  }

  return (
    <div
      ref={listRef}
      role="tablist"
      aria-label={label}
      onKeyDown={handleKeyDown}
      className={cn(
        // Scrolls sideways on narrow screens instead of wrapping.
        'flex max-w-full overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden',
        variant === 'underline'
          ? 'gap-1 border-b border-border'
          : 'w-fit gap-1 rounded-xl bg-background-subtle p-1',
        className,
      )}
    >
      {children}
    </div>
  );
}

export interface TabProps {
  value: string;
  children: ReactNode;
  icon?: ReactNode;
  /** Small count after the label, e.g. pending items. */
  count?: number;
  disabled?: boolean;
  className?: string;
}

export function Tab({
  value,
  children,
  icon,
  count,
  disabled = false,
  className,
}: TabProps): ReactNode {
  const { value: selectedValue, select, baseId, variant } = useTabs();
  const indicatorTransition = useIndicatorTransition();
  const selected = selectedValue === value;

  return (
    <button
      type="button"
      role="tab"
      id={tabId(baseId, value)}
      aria-selected={selected}
      aria-controls={panelId(baseId, value)}
      // Only the selected tab is in the Tab order; arrows move between the rest.
      tabIndex={selected ? 0 : -1}
      disabled={disabled}
      onClick={() => select(value)}
      className={cn(
        'relative inline-flex shrink-0 items-center gap-2 text-label whitespace-nowrap outline-none',
        'transition-colors duration-150 disabled:pointer-events-none disabled:opacity-50',
        'focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background',
        '[&_svg]:size-4 [&_svg]:shrink-0',
        variant === 'underline' ? 'rounded-t-md px-3 pt-2 pb-3' : 'rounded-lg px-3 py-1.5',
        selected ? 'text-fg' : 'text-fg-subtle hover:text-fg',
        className,
      )}
    >
      {selected ? (
        <motion.span
          layoutId="afaq-tab-indicator"
          transition={indicatorTransition}
          className={cn(
            'absolute',
            variant === 'underline'
              ? 'inset-x-2 -bottom-px h-0.5 rounded-full bg-primary'
              : 'inset-0 rounded-lg bg-surface shadow-subtle',
          )}
          aria-hidden="true"
        />
      ) : null}
      <span className="relative inline-flex items-center gap-2">
        {icon}
        {children}
        {count !== undefined ? (
          <span
            className={cn(
              'min-w-5 rounded-full px-1.5 text-center text-[0.6875rem] leading-5 text-numeric',
              selected ? 'bg-primary/12 text-primary-strong' : 'bg-background-subtle text-fg-muted',
            )}
          >
            {count}
          </span>
        ) : null}
      </span>
    </button>
  );
}

export interface TabPanelProps {
  value: string;
  children: ReactNode;
  className?: string;
}

export function TabPanel({ value, children, className }: TabPanelProps): ReactNode {
  const { value: selectedValue, baseId } = useTabs();
  if (selectedValue !== value) return null;

  return (
    <div
      role="tabpanel"
      id={panelId(baseId, value)}
      aria-labelledby={tabId(baseId, value)}
      tabIndex={0}
      className={cn('pt-5 outline-none focus-visible:ring-2 focus-visible:ring-ring', className)}
    >
      {children}
    </div>
  );
}
