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

/**
 * start and end follow reading direction:
 * start is left in English and right in Arabic.
 */
export type DrawerSide = 'start' | 'end' | 'bottom';

export type DrawerSize = 'sm' | 'md' | 'lg';

/**
 * sidebar uses the always-dark palette
 * for the mobile navigation menu.
 */
export type DrawerTone = 'surface' | 'sidebar';

const SIDE_CLASSES: Record<DrawerSide, string> = {
  start: 'inset-y-0 start-0 h-full max-w-[90vw] rounded-e-2xl border-e',

  end: 'inset-y-0 end-0 h-full max-w-[90vw] rounded-s-2xl border-s',

  bottom: 'inset-x-0 bottom-0 max-h-[85dvh] w-full rounded-t-2xl border-t',
};

const WIDTHS: Record<DrawerSize, string> = {
  sm: 'w-80',
  md: 'w-96',
  lg: 'w-[32rem]',
};

interface DrawerToneConfig {
  panel: string;
  divider: string;
  title: string;
  text: string;
  close: string;
}

const TONES: Record<DrawerTone, DrawerToneConfig> = {
  surface: {
    panel: 'border-border bg-surface',
    divider: 'border-border-subtle',
    title: 'text-fg',
    text: 'text-fg-secondary',
    close: '',
  },

  sidebar: {
    panel: 'border-sidebar-border bg-sidebar-background',
    divider: 'border-sidebar-border',
    title: 'text-sidebar-text',
    text: 'text-sidebar-text-muted',
    close:
      'text-sidebar-text-muted hover:bg-sidebar-hover hover:text-sidebar-text focus-visible:ring-sidebar-active focus-visible:ring-offset-sidebar-background',
  },
};

export interface DrawerProps {
  open: boolean;

  onClose: () => void;

  title: ReactNode;

  description?: ReactNode;

  side?: DrawerSide;

  size?: DrawerSize;

  tone?: DrawerTone;

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
  tone = 'surface',
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

  const palette = TONES[tone];

  const dismiss = useCallback(() => {
    if (dismissible) {
      onClose();
    }
  }, [dismissible, onClose]);

  useBodyScrollLock(open);

  useEscapeKey(open, dismiss, isTopmost);

  useFocusTrap(panelRef, open, isTopmost);

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
                'fixed flex flex-col shadow-overlay outline-none',
                palette.panel,
                SIDE_CLASSES[side],
                side !== 'bottom' && WIDTHS[size],
                className,
              )}
            >
              <div
                className={cn(
                  'flex shrink-0 items-start justify-between gap-4 border-b p-5',
                  palette.divider,
                )}
              >
                <div className="min-w-0">
                  <h2 id={titleId} className={cn('text-h5', palette.title)}>
                    {title}
                  </h2>

                  {description ? (
                    <p id={descriptionId} className={cn('mt-1 text-body-small', palette.text)}>
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
                    className={cn('-me-1.5 -mt-1 w-8', palette.close)}
                  />
                ) : null}
              </div>

              <div
                className={cn(
                  'scrollbar-subtle min-h-0 flex-1 overflow-y-auto overscroll-contain p-5 text-body',
                  palette.text,
                  tone === 'sidebar' && 'scrollbar-sidebar',
                )}
              >
                {children}
              </div>

              {footer ? (
                <div
                  className={cn(
                    'flex shrink-0 flex-wrap gap-3 border-t p-5',
                    palette.divider,
                    'pb-[max(1.25rem,env(safe-area-inset-bottom))]',
                  )}
                >
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
