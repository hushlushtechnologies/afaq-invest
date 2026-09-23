'use client';

import { Check, Minus } from 'lucide-react';
import { useEffect, useId, useRef, type ComponentPropsWithRef, type ReactNode } from 'react';
import { cn } from '@afaq/utils';
import { ChoiceLabel } from './choice-label';
import { useFormField } from './form-field-context';
import { mergeRefs } from './merge-refs';

export interface CheckboxProps extends Omit<ComponentPropsWithRef<'input'>, 'type'> {
  label?: ReactNode;
  description?: ReactNode;
  error?: boolean;
  /** Part-selected, for "select all" headers. */
  indeterminate?: boolean;
  wrapperClassName?: string;
}

export function Checkbox({
  label,
  description,
  error,
  indeterminate = false,
  wrapperClassName,
  className,
  id,
  disabled,
  ref,
  ...props
}: CheckboxProps): ReactNode {
  const field = useFormField();
  const generatedId = useId();
  const inputRef = useRef<HTMLInputElement | null>(null);

  const inputId = id ?? field?.controlId ?? generatedId;
  const descriptionId = `${inputId}-choice-description`;
  const isError = error ?? Boolean(field?.error);
  const isDisabled = disabled ?? field?.disabled ?? false;

  // "indeterminate" can only be set from JavaScript, not as an HTML attribute.
  useEffect(() => {
    if (inputRef.current) inputRef.current.indeterminate = indeterminate;
  }, [indeterminate]);

  return (
    <div className={cn('flex items-start gap-2.5', isDisabled && 'opacity-60', wrapperClassName)}>
      <span className="relative mt-0.5 flex size-4.5 shrink-0">
        <input
          ref={mergeRefs(inputRef, ref)}
          id={inputId}
          type="checkbox"
          disabled={isDisabled}
          aria-invalid={isError || undefined}
          aria-describedby={description ? descriptionId : undefined}
          className={cn(
            'peer absolute inset-0 z-10 m-0 cursor-pointer opacity-0 disabled:cursor-not-allowed',
            className,
          )}
          {...props}
        />
        <span
          aria-hidden="true"
          className={cn(
            'flex size-full items-center justify-center rounded-[0.3rem] border bg-surface',
            'transition-colors duration-150',
            isError ? 'border-danger' : 'border-border-strong',
            'peer-hover:border-primary',
            'peer-checked:border-primary peer-checked:bg-primary',
            'peer-indeterminate:border-primary peer-indeterminate:bg-primary',
            'peer-focus-visible:ring-2 peer-focus-visible:ring-ring peer-focus-visible:ring-offset-2 peer-focus-visible:ring-offset-background',
            'peer-checked:[&_.afaq-check]:opacity-100',
          )}
        >
          {indeterminate ? (
            <Minus className="size-3 text-primary-foreground" strokeWidth={3} />
          ) : (
            <Check
              className="afaq-check size-3 text-primary-foreground opacity-0 transition-opacity duration-100"
              strokeWidth={3}
            />
          )}
        </span>
      </span>

      <ChoiceLabel
        htmlFor={inputId}
        label={label}
        description={description}
        descriptionId={descriptionId}
        disabled={isDisabled}
      />
    </div>
  );
}
