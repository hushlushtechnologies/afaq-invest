'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { X } from 'lucide-react';
import { useCallback, useId, useRef, type MouseEvent, type ReactNode } from 'react';
import { cn } from '@afaq/utils';
import { IconButton } from '../button/icon-button';
import { useMotionPreset } from '../motion/use-motion-preset';
import { Backdrop } from './backdrop';
import { useOverlayStack } from './overlay-stack';
import { Portal } from './portal';
import { useBodyScrollLock } from './use-body-scroll-lock';
import { useEscapeKey } from './use-escape-key';
import { useFocusTrap } from './use-focus-trap';

export type ModalSize = 'sm' | 'md' | 'lg' | 'xl' | 'full';

const SIZES: Record<ModalSize, string> = {
  sm: 'sm:max-w-md',
  md: 'sm:max-w-lg',
  lg: 'sm:max-w-2xl',
  xl: 'sm:max-w-4xl',
  full: 'sm:max-w-[calc(100vw-2rem)]',
};

export interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: ReactNode;
  description?: ReactNode;
  size?: ModalSize;
  children?: ReactNode;
  /** Buttons along the bottom. */
  footer?: ReactNode;
  /** Hide the × button — only when the footer offers a clear way out. */
  hideCloseButton?: boolean;
  /** False blocks Escape and outside clicks, e.g. while saving. */
  dismissible?: boolean;
  closeLabel?: string;
  className?: string;
}

export function Modal({
  open,
  onClose,
  title,
  description,
  size = 'md',
  children,
  footer,
  hideCloseButton = false,
  dismissible = true,
  closeLabel = 'Close',
  className,
}: ModalProps): ReactNode {
  const panelRef = useRef<HTMLDivElement>(null);
  const titleId = useId();
  const descriptionId = useId();
  const motionProps = useMotionPreset('modal');
  const isTopmost = useOverlayStack(open);

  const dismiss = useCallback(() => {
    if (dismissible) onClose();
  }, [dismissible, onClose]);

  useBodyScrollLock(open);
  useEscapeKey(open, dismiss, isTopmost);
  useFocusTrap(panelRef, open, isTopmost);

  function handleOutsidePress(event: MouseEvent<HTMLDivElement>): void {
    if (event.target === event.currentTarget) dismiss();
  }

  return (
    <Portal>
      <AnimatePresence>
        {open ? (
          <div className="fixed inset-0 z-modal">
            <Backdrop />
            <div
              // On phones the dialog sits at the bottom, within thumb reach.
              className="fixed inset-0 flex items-end justify-center overflow-y-auto p-3 sm:items-center sm:p-6"
              onMouseDown={handleOutsidePress}
            >
              <motion.div
                ref={panelRef}
                role="dialog"
                aria-modal="true"
                aria-labelledby={titleId}
                aria-describedby={description ? descriptionId : undefined}
                tabIndex={-1}
                {...motionProps}
                className={cn(
                  'relative flex max-h-[calc(100dvh-1.5rem)] w-full flex-col rounded-2xl border border-border bg-surface shadow-overlay outline-none',
                  SIZES[size],
                  className,
                )}
              >
                <div className="flex shrink-0 items-start justify-between gap-4 p-5 pb-0">
                  <div className="min-w-0">
                    <h2 id={titleId} className="text-h4 text-fg">
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

                {/* Only the middle scrolls — the title and buttons stay in view. */}
                <div className="min-h-0 flex-1 overflow-y-auto p-5 text-body text-fg-secondary">
                  {children}
                </div>

                {footer ? (
                  <div className="flex shrink-0 flex-wrap justify-end gap-3 border-t border-border-subtle p-5">
                    {footer}
                  </div>
                ) : null}
              </motion.div>
            </div>
          </div>
        ) : null}
      </AnimatePresence>
    </Portal>
  );
}
