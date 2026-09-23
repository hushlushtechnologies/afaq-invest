'use client';

import { AnimatePresence, motion } from 'framer-motion';
import {
  cloneElement,
  createContext,
  useCallback,
  useContext,
  useId,
  useRef,
  useState,
  type KeyboardEvent,
  type MouseEvent,
  type ReactElement,
  type ReactNode,
} from 'react';
import { cn } from '@afaq/utils';
import { useMotionPreset } from '../motion/use-motion-preset';
import { useOverlayStack } from './overlay-stack';
import { Portal } from './portal';
import { useClickOutside } from './use-click-outside';
import { useEscapeKey } from './use-escape-key';
import { useFloatingPosition, type OverlayPlacement } from './use-floating-position';

const ITEM_SELECTOR = '[role="menuitem"]:not(:disabled)';

/** Lets each item close its menu after it is chosen. */
const DropdownContext = createContext<(() => void) | null>(null);

interface TriggerProps {
  onClick?: (event: MouseEvent<HTMLElement>) => void;
  onKeyDown?: (event: KeyboardEvent<HTMLElement>) => void;
}

export interface DropdownProps {
  /** The element that opens the menu — usually a Button or IconButton. */
  trigger: ReactElement<TriggerProps>;
  children: ReactNode;
  /** Accessible name for the menu. */
  label: string;
  placement?: OverlayPlacement;
  className?: string;
  /** Control it from outside. Leave out to let the menu manage itself. */
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

/**
 * A menu of actions. Arrow keys, Home and End move between items, Escape
 * closes and returns focus to the trigger, Tab closes and moves on.
 */
export function Dropdown({
  trigger,
  children,
  label,
  placement = 'bottom-start',
  className,
  open: controlledOpen,
  onOpenChange,
}: DropdownProps): ReactNode {
  const [innerOpen, setInnerOpen] = useState(false);
  const open = controlledOpen ?? innerOpen;
  const menuId = useId();
  const triggerWrapRef = useRef<HTMLSpanElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const motionProps = useMotionPreset('popover');
  const isTopmost = useOverlayStack(open);
  const { refs, floatingStyles } = useFloatingPosition(open, { placement, fitHeight: true });

  const setOpen = useCallback(
    (next: boolean) => {
      if (controlledOpen === undefined) setInnerOpen(next);
      onOpenChange?.(next);
    },
    [controlledOpen, onOpenChange],
  );

  const focusTrigger = useCallback(() => {
    const element = triggerWrapRef.current?.firstElementChild;
    if (element instanceof HTMLElement) element.focus();
  }, []);

  const closeAndReturn = useCallback(() => {
    setOpen(false);
    focusTrigger();
  }, [setOpen, focusTrigger]);

  useEscapeKey(open, closeAndReturn, isTopmost);
  useClickOutside([triggerWrapRef, menuRef], open, () => setOpen(false));

  function items(): HTMLElement[] {
    return Array.from(menuRef.current?.querySelectorAll<HTMLElement>(ITEM_SELECTOR) ?? []);
  }

  function focusItem(index: number): void {
    const list = items();
    if (list.length === 0) return;
    list[(index + list.length) % list.length]?.focus();
  }

  function openAndFocus(which: 'first' | 'last'): void {
    setOpen(true);
    // Wait for the menu to appear before moving focus into it.
    window.requestAnimationFrame(() =>
      window.requestAnimationFrame(() => focusItem(which === 'first' ? 0 : -1)),
    );
  }

  function handleTriggerKeyDown(event: KeyboardEvent<HTMLElement>): void {
    trigger.props.onKeyDown?.(event);
    if (event.key === 'ArrowDown' || event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      openAndFocus('first');
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      openAndFocus('last');
    }
  }

  function handleMenuKeyDown(event: KeyboardEvent<HTMLDivElement>): void {
    const current = items().indexOf(document.activeElement as HTMLElement);
    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault();
        focusItem(current + 1);
        break;
      case 'ArrowUp':
        event.preventDefault();
        focusItem(current - 1);
        break;
      case 'Home':
        event.preventDefault();
        focusItem(0);
        break;
      case 'End':
        event.preventDefault();
        focusItem(-1);
        break;
      case 'Tab':
        setOpen(false);
        break;
      default:
        break;
    }
  }

  const triggerElement = cloneElement(trigger, {
    'aria-haspopup': 'menu',
    'aria-expanded': open,
    'aria-controls': open ? menuId : undefined,
    onClick: (event: MouseEvent<HTMLElement>) => {
      trigger.props.onClick?.(event);
      setOpen(!open);
    },
    onKeyDown: handleTriggerKeyDown,
  } as TriggerProps);

  return (
    <>
      <span
        ref={(node) => {
          triggerWrapRef.current = node;
          refs.setReference(node);
        }}
        className="inline-flex"
      >
        {triggerElement}
      </span>

      <Portal>
        <AnimatePresence>
          {open ? (
            <div ref={refs.setFloating} style={floatingStyles} className="z-popover">
              <motion.div
                ref={menuRef}
                id={menuId}
                role="menu"
                aria-label={label}
                onKeyDown={handleMenuKeyDown}
                {...motionProps}
                className={cn(
                  'max-h-[inherit] min-w-48 overflow-y-auto rounded-xl border border-border bg-surface-elevated p-1.5 shadow-overlay outline-none',
                  className,
                )}
              >
                <DropdownContext.Provider value={closeAndReturn}>
                  {children}
                </DropdownContext.Provider>
              </motion.div>
            </div>
          ) : null}
        </AnimatePresence>
      </Portal>
    </>
  );
}

export interface DropdownItemProps {
  children: ReactNode;
  onSelect?: () => void;
  icon?: ReactNode;
  /** Short text on the trailing edge, e.g. a keyboard shortcut. */
  shortcut?: string;
  tone?: 'default' | 'danger';
  disabled?: boolean;
  className?: string;
}

export function DropdownItem({
  children,
  onSelect,
  icon,
  shortcut,
  tone = 'default',
  disabled = false,
  className,
}: DropdownItemProps): ReactNode {
  const closeMenu = useContext(DropdownContext);

  function handleClick(): void {
    // Close first and return focus to the trigger, then run the action —
    // so an action that opens a dialog gets focus back correctly afterwards.
    closeMenu?.();
    onSelect?.();
  }

  return (
    <button
      type="button"
      role="menuitem"
      tabIndex={-1}
      disabled={disabled}
      onClick={handleClick}
      className={cn(
        'flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-start text-body-small',
        'transition-colors duration-100 outline-none [&_svg]:size-4 [&_svg]:shrink-0',
        'disabled:pointer-events-none disabled:opacity-50',
        tone === 'danger'
          ? 'text-danger-strong hover:bg-danger-surface focus-visible:bg-danger-surface'
          : 'text-fg-secondary hover:bg-surface-hover hover:text-fg focus-visible:bg-surface-hover focus-visible:text-fg',
        className,
      )}
    >
      {icon ? <span className="shrink-0">{icon}</span> : null}
      <span className="min-w-0 flex-1 truncate">{children}</span>
      {shortcut ? (
        <span className="shrink-0 font-mono text-caption text-fg-muted">{shortcut}</span>
      ) : null}
    </button>
  );
}

export function DropdownSeparator(): ReactNode {
  return <div role="separator" className="my-1.5 h-px bg-border-subtle" />;
}

export function DropdownLabel({ children }: { children: ReactNode }): ReactNode {
  return (
    <p role="presentation" className="px-2.5 pt-1.5 pb-1 text-caption font-medium text-fg-muted">
      {children}
    </p>
  );
}
