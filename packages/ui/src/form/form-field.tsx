'use client';

import { useId, useMemo, useState, type ReactNode } from 'react';
import { cn } from '@afaq/utils';
import { FormFieldContext, type FormFieldContextValue } from './form-field-context';

export interface FormFieldProps {
  children: ReactNode;
  /**
   * Validation error. Pass the message text (it is shown by <FormMessage />)
   * or `true` for an error state without text.
   * Works directly with React Hook Form: error={errors.email?.message}
   */
  error?: string | boolean;
  /** Green confirmation state, e.g. after an email is verified. */
  success?: boolean;
  required?: boolean;
  disabled?: boolean;
  /** Supply an id when something outside the field needs to reference the control. */
  id?: string;
  className?: string;
}

/**
 * Groups a label, a control and its helper texts. Generates the ids once and
 * shares them, so the label, error and description are always correctly
 * linked for screen readers without any manual wiring.
 */
export function FormField({
  children,
  error,
  success = false,
  required = false,
  disabled = false,
  id,
  className,
}: FormFieldProps): ReactNode {
  const generatedId = useId();
  const controlId = id ?? generatedId;
  const [hasDescription, setHasDescription] = useState(false);
  const [hasMessage, setHasMessage] = useState(false);

  const value = useMemo<FormFieldContextValue>(
    () => ({
      controlId,
      labelId: `${controlId}-label`,
      descriptionId: `${controlId}-description`,
      messageId: `${controlId}-message`,
      error: error || undefined,
      success,
      required,
      disabled,
      hasDescription,
      hasMessage,
      setHasDescription,
      setHasMessage,
    }),
    [controlId, error, success, required, disabled, hasDescription, hasMessage],
  );

  return (
    <FormFieldContext.Provider value={value}>
      <div className={cn('flex w-full flex-col gap-1.5', className)}>{children}</div>
    </FormFieldContext.Provider>
  );
}
