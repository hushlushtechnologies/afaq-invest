'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { cn } from '@afaq/utils';
import { Spinner } from '../feedback/spinner';

export interface LoadingStateProps {
  label?: string;
  /** 'inline' sits in a line of text, 'block' fills a section, 'page' fills the screen area. */
  variant?: 'inline' | 'block' | 'page';
  /**
   * Wait this long (ms) before showing anything. Fast loads then never flash
   * a spinner. 0 shows it immediately.
   */
  delay?: number;
  className?: string;
}

export function LoadingState({
  label = 'Loading',
  variant = 'block',
  delay = 200,
  className,
}: LoadingStateProps): ReactNode {
  const [visible, setVisible] = useState(delay === 0);

  useEffect(() => {
    if (delay === 0) return;
    const timer = window.setTimeout(() => setVisible(true), delay);
    return () => window.clearTimeout(timer);
  }, [delay]);

  // During the delay, still tell screen readers something is happening.
  if (!visible) {
    return (
      <span role="status" className="sr-only">
        {label}
      </span>
    );
  }

  if (variant === 'inline') {
    return (
      <span
        role="status"
        className={cn('inline-flex items-center gap-2 text-body-small text-fg-subtle', className)}
      >
        <Spinner size="sm" label={label} />
        <span aria-hidden="true">{label}</span>
      </span>
    );
  }

  return (
    <div
      role="status"
      className={cn(
        'flex flex-col items-center justify-center gap-3 text-fg-subtle',
        variant === 'page' ? 'min-h-[50vh]' : 'py-14',
        className,
      )}
    >
      <Spinner size="lg" label={label} className="text-primary" />
      <span aria-hidden="true" className="text-body-small">
        {label}
      </span>
    </div>
  );
}

export interface LoadingOverlayProps {
  /** Show the overlay on top of the existing content. */
  active: boolean;
  label?: string;
  children: ReactNode;
  className?: string;
}

/**
 * Keeps existing content visible but dimmed while it refreshes — so a
 * re-load doesn't make the page jump to an empty spinner and back.
 */
export function LoadingOverlay({
  active,
  label = 'Updating',
  children,
  className,
}: LoadingOverlayProps): ReactNode {
  return (
    <div className={cn('relative', className)} aria-busy={active || undefined}>
      <div
        className={cn(
          'transition-opacity duration-200',
          active && 'pointer-events-none opacity-50',
        )}
      >
        {children}
      </div>
      {active ? (
        <div role="status" className="absolute inset-0 flex items-center justify-center">
          <span className="inline-flex items-center gap-2 rounded-full border border-border bg-surface-elevated px-4 py-2 text-body-small text-fg-secondary shadow-elevated">
            <Spinner size="sm" label={label} className="text-primary" />
            <span aria-hidden="true">{label}</span>
          </span>
        </div>
      ) : null}
    </div>
  );
}
