'use client';

import { ChevronDown } from 'lucide-react';
import type { ComponentPropsWithRef, ReactNode } from 'react';
import { cn } from '@afaq/utils';
import { FIELD_HEIGHTS, fieldShell, resolveFieldState, type FieldSize } from './field-styles';
import { describedByFor, useFormField } from './form-field-context';

export interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

export interface SelectProps extends Omit<ComponentPropsWithRef<'select'>, 'size'> {
  fieldSize?: FieldSize;
  error?: boolean;
  success?: boolean;
  options?: readonly SelectOption[];
  /** Shown as a disabled first option while nothing is chosen. */
  placeholder?: string;
  wrapperClassName?: string;
}

/**
 * A styled native <select>. The browser supplies keyboard handling,
 * type-to-find and the phone's own picker, which a custom dropdown would
 * have to rebuild.
 */
export function Select({
  fieldSize = 'md',
  error,
  success,
  options,
  placeholder,
  wrapperClassName,
  className,
  children,
  id,
  disabled,
  required,
  value,
  defaultValue,
  ...props
}: SelectProps): ReactNode {
  const field = useFormField();

  const isError = error ?? Boolean(field?.error);
  const isSuccess = success ?? field?.success ?? false;
  const isDisabled = disabled ?? field?.disabled ?? false;
  const isRequired = required ?? field?.required ?? false;

  // With a placeholder and no value supplied, start on the placeholder.
  const startOnPlaceholder =
    placeholder !== undefined && value === undefined && defaultValue === undefined;

  return (
    <div
      className={fieldShell({
        state: resolveFieldState(isError, isSuccess),
        disabled: isDisabled,
        className: cn('relative', wrapperClassName),
      })}
    >
      <select
        id={id ?? field?.controlId}
        disabled={isDisabled}
        required={isRequired}
        value={value}
        defaultValue={startOnPlaceholder ? '' : defaultValue}
        aria-invalid={isError || undefined}
        aria-describedby={describedByFor(field)}
        className={cn(
          'w-full min-w-0 appearance-none border-0 bg-transparent ps-3 pe-9 text-fg outline-none',
          'disabled:cursor-not-allowed',
          FIELD_HEIGHTS[fieldSize],
          className,
        )}
        {...props}
      >
        {placeholder !== undefined ? (
          <option value="" disabled>
            {placeholder}
          </option>
        ) : null}
        {options?.map((option) => (
          <option key={option.value} value={option.value} disabled={option.disabled}>
            {option.label}
          </option>
        ))}
        {children}
      </select>

      <ChevronDown
        className="pointer-events-none absolute end-3 size-4 text-fg-muted"
        aria-hidden="true"
      />
    </div>
  );
}
