'use client';

import { useState, type ChangeEvent, type ComponentPropsWithRef, type ReactNode } from 'react';
import { cn } from '@afaq/utils';
import { FIELD_CONTROL, fieldShell, resolveFieldState } from './field-styles';
import { describedByFor, useFormField } from './form-field-context';

export interface TextareaProps extends ComponentPropsWithRef<'textarea'> {
  error?: boolean;
  success?: boolean;
  /** Shows "used / maxLength" under the box. Needs maxLength. */
  showCount?: boolean;
  wrapperClassName?: string;
}

export function Textarea({
  error,
  success,
  showCount = false,
  wrapperClassName,
  className,
  id,
  rows = 4,
  disabled,
  readOnly,
  required,
  maxLength,
  onChange,
  value,
  defaultValue,
  ...props
}: TextareaProps): ReactNode {
  const field = useFormField();
  const [count, setCount] = useState(() => String(value ?? defaultValue ?? '').length);

  const isError = error ?? Boolean(field?.error);
  const isSuccess = success ?? field?.success ?? false;
  const isDisabled = disabled ?? field?.disabled ?? false;
  const isRequired = required ?? field?.required ?? false;
  const current = value !== undefined ? String(value).length : count;

  function handleChange(event: ChangeEvent<HTMLTextAreaElement>): void {
    setCount(event.target.value.length);
    onChange?.(event);
  }

  return (
    <div className="flex w-full flex-col gap-1">
      <div
        className={fieldShell({
          state: resolveFieldState(isError, isSuccess),
          disabled: isDisabled,
          readOnly,
          className: cn('py-2', wrapperClassName),
        })}
      >
        <textarea
          id={id ?? field?.controlId}
          rows={rows}
          disabled={isDisabled}
          readOnly={readOnly}
          required={isRequired}
          maxLength={maxLength}
          value={value}
          defaultValue={defaultValue}
          onChange={handleChange}
          aria-invalid={isError || undefined}
          aria-describedby={describedByFor(field)}
          className={cn(FIELD_CONTROL, 'resize-y text-sm leading-relaxed', className)}
          {...props}
        />
      </div>
      {showCount && maxLength ? (
        <p className="self-end text-caption text-numeric text-fg-muted" aria-live="polite">
          {current} / {maxLength}
        </p>
      ) : null}
    </div>
  );
}
