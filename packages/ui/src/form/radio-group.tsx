'use client';

import type { ReactNode } from 'react';
import { cn } from '@afaq/utils';
import { describedByFor, useFormField } from './form-field-context';

export interface RadioGroupProps {
  children: ReactNode;
  /**
   * Read by screen readers as the question the options answer.
   * Inside a FormField, the FormLabel is used automatically.
   */
  label?: string;
  orientation?: 'vertical' | 'horizontal';
  className?: string;
}

/**
 * Wraps related radios. Arrow keys move between them — the browser does
 * this automatically for radios that share a `name`.
 */
export function RadioGroup({
  children,
  label,
  orientation = 'vertical',
  className,
}: RadioGroupProps): ReactNode {
  const field = useFormField();

  return (
    <div
      role="radiogroup"
      aria-label={label}
      aria-labelledby={label ? undefined : field?.labelId}
      aria-required={field?.required || undefined}
      aria-invalid={field?.error ? true : undefined}
      aria-describedby={describedByFor(field)}
      className={cn(
        'flex',
        orientation === 'vertical' ? 'flex-col gap-3' : 'flex-row flex-wrap gap-x-6 gap-y-3',
        className,
      )}
    >
      {children}
    </div>
  );
}
