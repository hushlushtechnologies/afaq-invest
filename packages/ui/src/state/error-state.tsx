'use client';

import { AlertTriangle, RotateCcw } from 'lucide-react';
import { useState, type ReactNode } from 'react';
import { Button } from '../button/button';
import { StateView, type StateSize } from './state-view';

export interface ErrorStateProps {
  title?: ReactNode;
  /** A plain-language explanation of what went wrong and what to do. */
  description?: ReactNode;
  /** Retrying can be async; the button shows a spinner until it finishes. */
  onRetry?: () => void | Promise<void>;
  retryLabel?: string;
  /** Extra actions, e.g. "Contact support". */
  actions?: ReactNode;
  /**
   * Technical detail (error code, request id) for staff and support.
   * Hidden behind "Show details" so it never alarms anyone by default.
   */
  details?: string;
  detailsLabel?: string;
  size?: StateSize;
  className?: string;
}

export function ErrorState({
  title = 'Something went wrong',
  description = 'This could not be loaded. Try again, and if it keeps happening, contact support.',
  onRetry,
  retryLabel = 'Try again',
  actions,
  details,
  detailsLabel = 'Show technical details',
  size = 'md',
  className,
}: ErrorStateProps): ReactNode {
  const [retrying, setRetrying] = useState(false);

  async function handleRetry(): Promise<void> {
    if (!onRetry) return;
    setRetrying(true);
    try {
      await onRetry();
    } finally {
      setRetrying(false);
    }
  }

  return (
    <StateView
      icon={<AlertTriangle />}
      tone="danger"
      title={title}
      description={description}
      size={size}
      announce="alert"
      className={className}
      actions={
        onRetry || actions ? (
          <>
            {onRetry ? (
              <Button
                variant="outline"
                iconStart={<RotateCcw />}
                loading={retrying}
                onClick={handleRetry}
              >
                {retryLabel}
              </Button>
            ) : null}
            {actions}
          </>
        ) : undefined
      }
    >
      {details ? (
        <details className="rounded-lg border border-border bg-background-subtle text-start">
          <summary className="cursor-pointer px-3 py-2 text-caption text-fg-subtle outline-none select-none hover:text-fg focus-visible:ring-2 focus-visible:ring-ring">
            {detailsLabel}
          </summary>
          <pre className="overflow-x-auto border-t border-border px-3 py-2 font-mono text-caption whitespace-pre-wrap text-fg-secondary">
            {details}
          </pre>
        </details>
      ) : null}
    </StateView>
  );
}
