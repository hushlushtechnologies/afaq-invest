'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { X } from 'lucide-react';
import { useCallback, useId, useRef, type ReactNode } from 'react';
import { cn } from '@afaq/utils';
import { IconButton } from '../button/icon-button';
import { useMotionPreset } from '../motion/use-motion-preset';
import { Backdrop } from './backdrop';
import { useOverlayStack } from './overlay-stack';
import { Portal } from './portal';
import { useBodyScrollLock } from './use-body-scroll-lock';
import { useEscapeKey } from './use-escape-key';
import { useFocusTrap } from './use-focus-trap';

/** start and end follow reading direction: start is the left in English, the right in Arabic. */
export type DrawerSide = 'start' | 'end' | 'bottom';
export type DrawerSize = 'sm' | 'md' | 'lg';

const SIDE_CLASSES: Record<DrawerSide, string> = {
  start: 'inset-y-0 start-0 h-full max-w-[90vw] rounded-e-2xl border-e',
  end: 'inset-y-0 end-0 h-full max-w-[90vw] rounded-s-2xl border-s',
  bottom: 'inset-x-0 bottom-0 max-h-[85dvh] w-full rounded-t-2xl border-t',
};

const WIDTHS: Record<DrawerSize, string> = { sm: 'w-80', md: 'w-96', lg: 'w-[32rem]' };

export interface DrawerProps {
  open: boolean;
  onClose: () => void;
  title: ReactNode;
  description?: ReactNode;
  side?: DrawerSide;
  size?: DrawerSize;
  children?: ReactNode;
  footer?: ReactNode;
  hideCloseButton?: boolean;
  dismissible?: boolean;
  closeLabel?: string;
  className?: string;
}

export function Drawer({
  open,
  onClose,
  title,
  description,
  side = 'end',
  size = 'md',
  children,
  footer,
  hideCloseButton = false,
  dismissible = true,
  closeLabel = 'Close',
  className,
}: DrawerProps): ReactNode {
  const panelRef = useRef<HTMLDivElement>(null);
  const titleId = useId();
  const descriptionId = useId();
  const isTopmost = useOverlayStack(open);

  const dismiss = useCallback(() => {
    if (dismissible) onClose();
  }, [dismissible, onClose]);

  useBodyScrollLock(open);
  useEscapeKey(open, dismiss, isTopmost);
  useFocusTrap(panelRef, open, isTopmost);

  // The preset works out which physical edge "start" and "end" are, and
  // follows the language if it changes while the drawer is open.
  const motionProps = useMotionPreset(
    side === 'start' ? 'drawerStart' : side === 'end' ? 'drawerEnd' : 'drawerBottom',
  );

  return (
    <Portal>
      <AnimatePresence>
        {open ? (
          <div className="fixed inset-0 z-drawer">
            <Backdrop onClick={dismiss} />
            <motion.div
              ref={panelRef}
              role="dialog"
              aria-modal="true"
              aria-labelledby={titleId}
              aria-describedby={description ? descriptionId : undefined}
              tabIndex={-1}
              {...motionProps}
              className={cn(
                'fixed flex flex-col border-border bg-surface shadow-overlay outline-none',
                SIDE_CLASSES[side],
                side !== 'bottom' && WIDTHS[size],
                className,
              )}
            >
              <div className="flex shrink-0 items-start justify-between gap-4 border-b border-border-subtle p-5">
                <div className="min-w-0">
                  <h2 id={titleId} className="text-h5 text-fg">
                    {title}
                  </h2>
                  {description ? (
                    <p id={descriptionId} className="mt-1 text-body-small text-fg-subtle">
                      {description}
                    </p>
                  ) : null}
                </div>
                {!hideCloseButton ? (
                  <IconButton
                    icon={<X />}
                    label={closeLabel}
                    size="sm"
                    onClick={onClose}
                    disabled={!dismissible}
                    className="-me-1.5 -mt-1 w-8"
                  />
                ) : null}
              </div>

              <div className="min-h-0 flex-1 overflow-y-auto p-5 text-body text-fg-secondary">
                {children}
              </div>

              {footer ? (
                <div className="flex shrink-0 flex-wrap gap-3 border-t border-border-subtle p-5">
                  {footer}
                </div>
              ) : null}
            </motion.div>
          </div>
        ) : null}
      </AnimatePresence>
    </Portal>
  );
}
