'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { WifiOff } from 'lucide-react';
import type { ReactNode } from 'react';
import { cn } from '@afaq/utils';
import { useMotionPreset } from '../motion/use-motion-preset';
import { StateView, type StateSize } from './state-view';
import { useOnlineStatus } from './use-online-status';

export interface OfflineStateProps {
  title?: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  size?: StateSize;
  className?: string;
}

/** A section-sized message for content that can't load without a connection. */
export function OfflineState({
  title = 'You’re offline',
  description = 'Check your internet connection. This will load again once you’re back online.',
  actions,
  size = 'md',
  className,
}: OfflineStateProps): ReactNode {
  return (
    <StateView
      icon={<WifiOff />}
      tone="neutral"
      title={title}
      description={description}
      actions={actions}
      size={size}
      announce="status"
      className={className}
    />
  );
}

export interface OfflineBannerProps {
  message?: string;
  className?: string;
}

/**
 * Appears on its own when the connection drops and disappears when it
 * returns. Place it once in the app shell.
 */
export function OfflineBanner({
  message = 'You’re offline. Changes can’t be saved until your connection returns.',
  className,
}: OfflineBannerProps): ReactNode {
  const online = useOnlineStatus();
  const motionProps = useMotionPreset('fadeUp');

  return (
    <AnimatePresence>
      {!online ? (
        <motion.div
          role="status"
          {...motionProps}
          className={cn(
            'fixed inset-x-3 bottom-3 z-toast mx-auto flex max-w-lg items-center gap-3 rounded-xl',
            'bg-sidebar-background px-4 py-3 text-body-small text-sidebar-text shadow-overlay',
            className,
          )}
        >
          <WifiOff className="size-4 shrink-0 text-warning" aria-hidden="true" />
          <span>{message}</span>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
