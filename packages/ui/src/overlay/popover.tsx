'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { X } from 'lucide-react';
import {
  cloneElement,
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  type MouseEvent,
  type ReactElement,
  type ReactNode,
} from 'react';
import { cn } from '@afaq/utils';
import { IconButton } from '../button/icon-button';
import { useMotionPreset } from '../motion/use-motion-preset';
import { useOverlayStack } from './overlay-stack';
import { Portal } from './portal';
import { useClickOutside } from './use-click-outside';
import { useEscapeKey } from './use-escape-key';
import { useFloatingPosition, type OverlayPlacement } from './use-floating-position';

interface TriggerProps {
  onClick?: (event: MouseEvent<HTMLElement>) => void;
}

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

const WIDTHS = {
  sm: 'w-64',
  md: 'w-80',
  lg: 'w-96',
} as const;

export interface PopoverProps {
  trigger: ReactElement<TriggerProps>;
  children: ReactNode;
  title?: ReactNode;
  placement?: OverlayPlacement;
  width?: keyof typeof WIDTHS;
  showCloseButton?: boolean;
  closeLabel?: string;
  className?: string;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

/**
 * A floating glass panel for content rather than actions.
 *
 * Escape or an outside click closes it.
 * Focus moves into the panel when it opens and returns to the
 * trigger when it closes.
 */
export function Popover({
  trigger,
  children,
  title,
  placement = 'bottom-start',
  width = 'md',
  showCloseButton = false,
  closeLabel = 'Close',
  className,
  open: controlledOpen,
  onOpenChange,
}: PopoverProps): ReactNode {
  const [innerOpen, setInnerOpen] = useState(false);

  const open = controlledOpen ?? innerOpen;

  const panelId = useId();
  const titleId = useId();

  const triggerWrapRef = useRef<HTMLSpanElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  const motionProps = useMotionPreset('popover');

  const isTopmost = useOverlayStack(open);

  const { refs, floatingStyles } = useFloatingPosition(open, {
    placement,
    gap: 10,
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

  useClickOutside([triggerWrapRef, panelRef], open, () => setOpen(false));

  /**
   * Move focus into the panel when it opens.
   */
  useEffect(() => {
    if (!open) return;

    const frame = window.requestAnimationFrame(() => {
      panelRef.current?.focus();
    });

    return () => window.cancelAnimationFrame(frame);
  }, [open]);

  const triggerElement = cloneElement(trigger, {
    'aria-haspopup': 'dialog',
    'aria-expanded': open,
    'aria-controls': open ? panelId : undefined,

    onClick: (event: MouseEvent<HTMLElement>) => {
      trigger.props.onClick?.(event);
      setOpen(!open);
    },
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
                ref={panelRef}
                id={panelId}
                role="dialog"
                aria-labelledby={title ? titleId : undefined}
                tabIndex={-1}
                {...motionProps}
                className={cn(
                  // Sizing
                  'max-w-[calc(100vw-1rem)]',
                  WIDTHS[width],

                  // Shape
                  'overflow-hidden rounded-2xl',

                  // Glass surface
                  'border border-border/60',
                  'bg-surface-elevated/90',
                  'backdrop-blur-2xl',
                  'supports-[backdrop-filter]:bg-surface-elevated/76',

                  // Depth
                  'shadow-[0_24px_70px_-28px_oklch(0_0_0_/_0.55)]',
                  'shadow-[0_10px_35px_-18px_oklch(0_0_0_/_0.3)]',

                  // Focus
                  'outline-none',

                  // Brand atmosphere
                  'before:pointer-events-none',
                  'before:absolute',
                  'before:-start-12',
                  'before:-top-12',
                  'before:size-32',
                  'before:rounded-full',
                  'before:bg-primary/8',
                  'before:blur-3xl',

                  // Secondary glow
                  'after:pointer-events-none',
                  'after:absolute',
                  'after:-end-12',
                  'after:-bottom-12',
                  'after:size-32',
                  'after:rounded-full',
                  'after:bg-accent/6',
                  'after:blur-3xl',

                  className,
                )}
              >
                <div className="relative z-10">
                  {title || showCloseButton ? (
                    <div
                      className={cn(
                        'flex items-start justify-between gap-4',
                        'border-b border-border/40',
                        'px-4 pt-4 pb-3.5',
                      )}
                    >
                      {title ? (
                        <h3
                          id={titleId}
                          className={cn('min-w-0 flex-1', 'text-h6 font-semibold', 'text-fg')}
                        >
                          {title}
                        </h3>
                      ) : (
                        <span />
                      )}

                      {showCloseButton ? (
                        <IconButton
                          icon={<X />}
                          label={closeLabel}
                          size="sm"
                          onClick={closeAndReturn}
                          className={cn(
                            '-me-1.5 -mt-1.5',
                            'size-8 rounded-lg',
                            'text-fg-muted',
                            'hover:bg-surface-hover',
                            'hover:text-fg',
                          )}
                        />
                      ) : null}
                    </div>
                  ) : null}

                  <div className={cn('px-4 py-4', 'text-body-small text-fg-secondary')}>
                    {children}
                  </div>
                </div>
              </motion.div>
            </div>
          ) : null}
        </AnimatePresence>
      </Portal>
    </>
  );
}
