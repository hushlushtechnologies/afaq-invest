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
  type ElementType,
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

/**
 * Lets each item close its menu after it is chosen.
 */
const DropdownContext = createContext<(() => void) | null>(null);

/**
 * The trigger may be wrapped, so find the first element inside
 * that can actually take focus.
 */
function focusTrigger(wrapper: HTMLElement | null): void {
  if (!wrapper) return;

  const focusable = wrapper.querySelector<HTMLElement>(
    'button, a[href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
  );

  (focusable ?? (wrapper.firstElementChild as HTMLElement | null))?.focus();
}

interface TriggerProps {
  onClick?: (event: MouseEvent<HTMLElement>) => void;
  onKeyDown?: (event: KeyboardEvent<HTMLElement>) => void;
}

export interface DropdownProps {
  /**
   * The element that opens the menu.
   */
  trigger: ReactElement<TriggerProps>;

  children: ReactNode;

  /**
   * Accessible name for the menu.
   */
  label: string;

  placement?: OverlayPlacement;

  className?: string;

  /**
   * Control it from outside.
   * Leave out to let the menu manage itself.
   */
  open?: boolean;

  onOpenChange?: (open: boolean) => void;
}

/**
 * Floating glass dropdown.
 *
 * Arrow keys, Home and End move between items.
 * Escape closes and returns focus to the trigger.
 * Tab closes and allows focus to continue naturally.
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

  const { refs, floatingStyles } = useFloatingPosition(open, {
    placement,
    fitHeight: true,
  });

  const setOpen = useCallback(
    (next: boolean) => {
      if (controlledOpen === undefined) {
        setInnerOpen(next);
      }

      onOpenChange?.(next);
    },
    [controlledOpen, onOpenChange],
  );

  const closeAndReturn = useCallback(() => {
    setOpen(false);
    focusTrigger(triggerWrapRef.current);
  }, [setOpen]);

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
                  // Layout
                  'relative min-w-56 overflow-hidden p-1.5',
                  'max-h-[inherit]',

                  // Shape
                  'rounded-2xl',

                  // Glass surface
                  'border border-border/60',
                  'bg-surface-elevated/88',
                  'backdrop-blur-2xl',
                  'supports-[backdrop-filter]:bg-surface-elevated/72',

                  // Depth
                  'shadow-[0_24px_70px_-28px_oklch(0_0_0_/_0.55)]',
                  'shadow-[0_12px_35px_-18px_oklch(0_0_0_/_0.35)]',

                  // Focus
                  'outline-none',

                  // Brand atmosphere
                  'before:pointer-events-none',
                  'before:absolute',
                  'before:-start-10',
                  'before:-top-10',
                  'before:size-28',
                  'before:rounded-full',
                  'before:bg-primary/8',
                  'before:blur-3xl',

                  // Secondary atmospheric glow
                  'after:pointer-events-none',
                  'after:absolute',
                  'after:-end-12',
                  'after:-bottom-12',
                  'after:size-28',
                  'after:rounded-full',
                  'after:bg-accent/6',
                  'after:blur-3xl',

                  className,
                )}
              >
                <div className="relative z-10">
                  <DropdownContext.Provider value={closeAndReturn}>
                    {children}
                  </DropdownContext.Provider>
                </div>
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

  /**
   * Short text on the trailing edge,
   * e.g. a keyboard shortcut.
   */
  shortcut?: string;

  tone?: 'default' | 'danger';

  disabled?: boolean;

  className?: string;

  linkComponent?: ElementType;

  href?: string;
}

export function DropdownItem({
  children,
  onSelect,
  href,
  linkComponent: LinkComponent = 'a',
  icon,
  shortcut,
  tone = 'default',
  disabled = false,
  className,
}: DropdownItemProps): ReactNode {
  const closeMenu = useContext(DropdownContext);

  function handleClick(): void {
    closeMenu?.();
    onSelect?.();
  }

  const Component = href ? LinkComponent : 'button';

  return (
    <motion.div
      initial={false}
      whileHover={{ x: 1 }}
      transition={{
        duration: 0.16,
        ease: [0.22, 1, 0.36, 1],
      }}
    >
      <Component
        {...(href ? { href } : { type: 'button', disabled })}
        role="menuitem"
        tabIndex={-1}
        onClick={handleClick}
        className={cn(
          // Layout
          'group flex w-full items-center gap-2.5',
          'rounded-xl px-2.5 py-2.25',
          'text-start text-body-small',

          // Interaction
          'outline-none',
          'transition-[background-color,color,box-shadow,border-color]',
          'duration-150 ease-out-soft',

          // Icon
          '[&_svg]:size-4',
          '[&_svg]:shrink-0',
          '[&_svg]:transition-transform',
          '[&_svg]:duration-150',
          'group-hover:[&_svg]:scale-105',

          // Disabled
          'disabled:pointer-events-none',
          'disabled:opacity-45',

          disabled && href && 'pointer-events-none opacity-45',

          tone === 'danger'
            ? cn(
                'text-danger-strong',
                'hover:bg-danger-surface/70',
                'hover:text-danger-strong',
                'focus-visible:bg-danger-surface/70',
                'focus-visible:text-danger-strong',
              )
            : cn(
                'text-fg-secondary',

                'hover:bg-surface-hover/75',
                'hover:text-fg',

                'focus-visible:bg-surface-hover/75',
                'focus-visible:text-fg',

                'focus-visible:shadow-[inset_0_0_0_1px_oklch(1_0_0_/_0.06)]',

                'dark:hover:bg-white/[0.055]',
                'dark:focus-visible:bg-white/[0.055]',
              ),

          className,
        )}
      >
        {icon ? (
          <span
            className={cn(
              'flex size-7 shrink-0 items-center justify-center',
              'rounded-lg',
              'transition-colors duration-150',

              tone === 'danger'
                ? 'bg-danger-surface/50'
                : 'bg-surface/60 group-hover:bg-surface-elevated/80',
            )}
          >
            {icon}
          </span>
        ) : null}

        <span className="min-w-0 flex-1 truncate">{children}</span>

        {shortcut ? (
          <span
            className={cn(
              'shrink-0',
              'rounded-md',
              'border border-border/50',
              'bg-surface/55',
              'px-1.5 py-0.5',
              'font-mono text-[10px]',
              'leading-none',
              'text-fg-muted',
              'shadow-sm',
            )}
          >
            {shortcut}
          </span>
        ) : null}
      </Component>
    </motion.div>
  );
}

export function DropdownSeparator(): ReactNode {
  return (
    <div
      role="separator"
      className="my-1.5 h-px bg-gradient-to-r from-transparent via-border/70 to-transparent"
    />
  );
}

export function DropdownLabel({ children }: { children: ReactNode }): ReactNode {
  return (
    <p
      role="presentation"
      className={cn(
        'px-2.5 pt-2 pb-1',
        'text-[10px] font-semibold uppercase',
        'tracking-[0.12em]',
        'text-fg-muted',
      )}
    >
      {children}
    </p>
  );
}
