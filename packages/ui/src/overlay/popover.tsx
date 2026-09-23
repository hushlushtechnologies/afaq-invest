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

const WIDTHS = { sm: 'w-64', md: 'w-80', lg: 'w-96' } as const;

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
 * A small floating panel for content rather than actions — a filter form,
 * an explanation, a summary. Escape or an outside click closes it.
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
  const { refs, floatingStyles } = useFloatingPosition(open, { placement, gap: 8 });

  const setOpen = useCallback(
    (next: boolean) => {
      if (controlledOpen === undefined) setInnerOpen(next);
      onOpenChange?.(next);
    },
    [controlledOpen, onOpenChange],
  );

  const closeAndReturn = useCallback(() => {
    setOpen(false);
    const element = triggerWrapRef.current?.firstElementChild;
    if (element instanceof HTMLElement) element.focus();
  }, [setOpen]);

  useEscapeKey(open, closeAndReturn, isTopmost);
  useClickOutside([triggerWrapRef, panelRef], open, () => setOpen(false));

  // Move focus into the panel when it opens, so keyboard users land in it.
  useEffect(() => {
    if (!open) return;
    const frame = window.requestAnimationFrame(() => panelRef.current?.focus());
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
                  'max-w-[calc(100vw-1rem)] rounded-xl border border-border bg-surface-elevated p-4 shadow-overlay outline-none',
                  WIDTHS[width],
                  className,
                )}
              >
                {title || showCloseButton ? (
                  <div className="mb-3 flex items-start justify-between gap-3">
                    {title ? (
                      <h3 id={titleId} className="text-h6 text-fg">
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
                        className="-me-1.5 -mt-1 w-8"
                      />
                    ) : null}
                  </div>
                ) : null}
                <div className="text-body-small text-fg-secondary">{children}</div>
              </motion.div>
            </div>
          ) : null}
        </AnimatePresence>
      </Portal>
    </>
  );
}
