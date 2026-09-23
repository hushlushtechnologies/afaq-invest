'use client';

import type { ComponentPropsWithRef, ReactNode } from 'react';
import { cn } from '@afaq/utils';
import { useFormField } from './form-field-context';

export interface FormLabelProps extends ComponentPropsWithRef<'label'> {
  /** Small text on the trailing side, e.g. "Optional". */
  hint?: ReactNode;
}

export function FormLabel({ children, hint, className, ...props }: FormLabelProps): ReactNode {
  const field = useFormField();

  return (
    <div className="flex items-baseline justify-between gap-3">
      <label
        id={field?.labelId}
        htmlFor={field?.controlId}
        className={cn('text-label text-fg-secondary', field?.disabled && 'opacity-60', className)}
        {...props}
      >
        {children}
        {field?.required ? (
          // Hidden from screen readers: the control's own required state is announced instead.
          <span className="ms-0.5 text-danger" aria-hidden="true">
            *
          </span>
        ) : null}
      </label>
      {hint ? <span className="text-caption text-fg-muted">{hint}</span> : null}
    </div>
  );
}
