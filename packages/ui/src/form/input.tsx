'use client';

import type { ComponentPropsWithRef, ReactNode } from 'react';
import { cn } from '@afaq/utils';
import { Spinner } from '../feedback/spinner';
import {
  FIELD_CONTROL,
  FIELD_HEIGHTS,
  fieldShell,
  resolveFieldState,
  type FieldSize,
} from './field-styles';
import { describedByFor, useFormField } from './form-field-context';

export interface InputProps extends Omit<ComponentPropsWithRef<'input'>, 'size'> {
  fieldSize?: FieldSize;
  /** Error state. Inside a FormField this comes from the field automatically. */
  error?: boolean;
  success?: boolean;
  /** Shows a spinner at the trailing edge, e.g. while checking availability. */
  loading?: boolean;
  /** Icon at the leading edge — left in English, right in Arabic. */
  iconStart?: ReactNode;
  /** Icon or small control at the trailing edge. */
  iconEnd?: ReactNode;
  /** Short fixed text at the trailing edge, e.g. "months". */
  suffix?: ReactNode;
  wrapperClassName?: string;
}

export function Input({
  fieldSize = 'md',
  error,
  success,
  loading = false,
  iconStart,
  iconEnd,
  suffix,
  wrapperClassName,
  className,
  id,
  disabled,
  readOnly,
  required,
  ...props
}: InputProps): ReactNode {
  const field = useFormField();

  const isError = error ?? Boolean(field?.error);
  const isSuccess = success ?? field?.success ?? false;
  const isDisabled = disabled ?? field?.disabled ?? false;
  const isRequired = required ?? field?.required ?? false;

  return (
    <div
      className={fieldShell({
        state: resolveFieldState(isError, isSuccess),
        disabled: isDisabled,
        readOnly,
        className: wrapperClassName,
      })}
    >
      {iconStart ? (
        <span className="flex shrink-0 ps-3 text-fg-muted [&_svg]:size-4">{iconStart}</span>
      ) : null}

      <input
        id={id ?? field?.controlId}
        disabled={isDisabled}
        readOnly={readOnly}
        required={isRequired}
        aria-invalid={isError || undefined}
        aria-describedby={describedByFor(field)}
        className={cn(FIELD_CONTROL, FIELD_HEIGHTS[fieldSize], iconStart ? 'ps-2' : '', className)}
        {...props}
      />

      {suffix ? (
        <span className="shrink-0 pe-3 text-caption whitespace-nowrap text-fg-muted">{suffix}</span>
      ) : null}

      {loading ? (
        <span className="flex shrink-0 pe-3 text-fg-muted">
          <Spinner size="sm" />
        </span>
      ) : iconEnd ? (
        <span className="flex shrink-0 pe-2.5 text-fg-muted [&_svg]:size-4">{iconEnd}</span>
      ) : null}
    </div>
  );
}
