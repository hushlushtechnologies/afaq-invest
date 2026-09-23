'use client';

import { AnimatePresence, motion } from 'framer-motion';
import {
  cloneElement,
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  type FocusEvent,
  type MouseEvent,
  type ReactElement,
  type ReactNode,
} from 'react';
import { cn } from '@afaq/utils';
import { useMotionPreset } from '../motion/use-motion-preset';
import { Portal } from './portal';
import { useFloatingPosition, type OverlayPlacement } from './use-floating-position';

interface TriggerProps {
  onMouseEnter?: (event: MouseEvent<HTMLElement>) => void;
  onMouseLeave?: (event: MouseEvent<HTMLElement>) => void;
  onFocus?: (event: FocusEvent<HTMLElement>) => void;
  onBlur?: (event: FocusEvent<HTMLElement>) => void;
}

export interface TooltipProps {
  /** Short text. Anything longer belongs in a Popover. */
  content: ReactNode;
  /** One element — usually an IconButton. */
  children: ReactElement<TriggerProps>;
  placement?: OverlayPlacement;
  /** Wait before showing on hover, in milliseconds. Keyboard focus shows it at once. */
  delay?: number;
  disabled?: boolean;
  className?: string;
}

/**
 * A short label shown on hover and on keyboard focus. It never takes focus
 * itself and never blocks clicks.
 */
export function Tooltip({
  content,
  children,
  placement = 'top',
  delay = 400,
  disabled = false,
  className,
}: TooltipProps): ReactNode {
  const [open, setOpen] = useState(false);
  const timer = useRef<number | null>(null);
  const tooltipId = useId();
  const motionProps = useMotionPreset('tooltip');
  const { refs, floatingStyles } = useFloatingPosition(open, { placement, gap: 8 });

  const clearTimer = useCallback(() => {
    if (timer.current !== null) {
      window.clearTimeout(timer.current);
      timer.current = null;
    }
  }, []);

  const show = useCallback(
    (immediately: boolean) => {
      if (disabled) return;
      clearTimer();
      if (immediately || delay === 0) setOpen(true);
      else timer.current = window.setTimeout(() => setOpen(true), delay);
    },
    [clearTimer, delay, disabled],
  );

  const hide = useCallback(() => {
    clearTimer();
    setOpen(false);
  }, [clearTimer]);

  useEffect(() => clearTimer, [clearTimer]);

  // Escape hides the tooltip without moving focus.
  useEffect(() => {
    if (!open) return;
    function handleKeyDown(event: KeyboardEvent): void {
      if (event.key === 'Escape') hide();
    }
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [open, hide]);

  const trigger = cloneElement(children, {
    'aria-describedby': open ? tooltipId : undefined,
    onMouseEnter: (event: MouseEvent<HTMLElement>) => {
      children.props.onMouseEnter?.(event);
      show(false);
    },
    onMouseLeave: (event: MouseEvent<HTMLElement>) => {
      children.props.onMouseLeave?.(event);
      hide();
    },
    onFocus: (event: FocusEvent<HTMLElement>) => {
      children.props.onFocus?.(event);
      // Only keyboard focus — a mouse click also focuses, but already hovered.
      if (event.currentTarget.matches(':focus-visible')) show(true);
    },
    onBlur: (event: FocusEvent<HTMLElement>) => {
      children.props.onBlur?.(event);
      hide();
    },
  } as TriggerProps);

  return (
    <>
      <span ref={refs.setReference} className="inline-flex">
        {trigger}
      </span>
      <Portal>
        <AnimatePresence>
          {open && !disabled ? (
            <div
              ref={refs.setFloating}
              style={floatingStyles}
              className="pointer-events-none z-tooltip"
            >
              <motion.div
                id={tooltipId}
                role="tooltip"
                {...motionProps}
                className={cn(
                  // Uses the always-dark sidebar colours, so tooltips look the same in both themes.
                  'max-w-56 rounded-lg bg-sidebar-background px-2.5 py-1.5 text-xs leading-snug text-sidebar-text shadow-overlay',
                  className,
                )}
              >
                {content}
              </motion.div>
            </div>
          ) : null}
        </AnimatePresence>
      </Portal>
    </>
  );
}
