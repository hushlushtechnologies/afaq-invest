'use client';

import { AlertCircle, CheckCircle2 } from 'lucide-react';
import { useEffect, type ReactNode } from 'react';
import { cn } from '@afaq/utils';
import { useFormField } from './form-field-context';

export interface FormMessageProps {
  /** Text to show. Defaults to the FormField's error text, if it is a string. */
  children?: ReactNode;
  /** 'success' for confirmations. Defaults to 'error'. */
  variant?: 'error' | 'success';
  className?: string;
}

/**
 * Validation or confirmation text under a control. Renders nothing when
 * there is nothing to say, so it can always be placed in a field.
 */
export function FormMessage({
  children,
  variant = 'error',
  className,
}: FormMessageProps): ReactNode {
  const field = useFormField();
  const fieldError = typeof field?.error === 'string' ? field.error : undefined;
  const content = children ?? (variant === 'error' ? fieldError : undefined);
  const visible = content !== undefined && content !== null && content !== '';
  const setHasMessage = field?.setHasMessage;

  useEffect(() => {
    if (!setHasMessage) return;
    setHasMessage(visible);
    return () => setHasMessage(false);
  }, [setHasMessage, visible]);

  if (!visible) return null;

  const Icon = variant === 'error' ? AlertCircle : CheckCircle2;

  return (
    <p
      id={field?.messageId}
      role={variant === 'error' ? 'alert' : 'status'}
      className={cn(
        'flex items-start gap-1.5 text-caption',
        variant === 'error' ? 'text-danger-strong' : 'text-success-strong',
        className,
      )}
    >
      <Icon className="mt-px size-3.5 shrink-0" aria-hidden="true" />
      <span>{content}</span>
    </p>
  );
}
