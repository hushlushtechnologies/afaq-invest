'use client';

import { useId, type ComponentPropsWithRef, type ReactNode } from 'react';
import { cn } from '@afaq/utils';
import { ChoiceLabel } from './choice-label';
import { useFormField } from './form-field-context';

export interface RadioProps extends Omit<ComponentPropsWithRef<'input'>, 'type'> {
  label?: ReactNode;
  description?: ReactNode;
  error?: boolean;
  wrapperClassName?: string;
}

/** One option. Group radios with the same `name` inside a <RadioGroup>. */
export function Radio({
  label,
  description,
  error,
  wrapperClassName,
  className,
  id,
  disabled,
  ...props
}: RadioProps): ReactNode {
  const field = useFormField();
  const generatedId = useId();

  const inputId = id ?? generatedId;
  const descriptionId = `${inputId}-choice-description`;
  const isError = error ?? Boolean(field?.error);
  const isDisabled = disabled ?? field?.disabled ?? false;

  return (
    <div className={cn('flex items-start gap-2.5', isDisabled && 'opacity-60', wrapperClassName)}>
      <span className="relative mt-0.5 flex size-4.5 shrink-0">
        <input
          id={inputId}
          type="radio"
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
            'relative size-full rounded-full border bg-surface transition-colors duration-150',
            isError ? 'border-danger' : 'border-border-strong',
            'peer-hover:border-primary',
            'peer-checked:border-primary peer-checked:bg-primary',
            'peer-focus-visible:ring-2 peer-focus-visible:ring-ring peer-focus-visible:ring-offset-2 peer-focus-visible:ring-offset-background',
            // The white centre dot, drawn with ::after and scaled in when checked.
            'after:absolute after:inset-0 after:m-auto after:size-1.5 after:scale-0 after:rounded-full after:bg-primary-foreground after:transition-transform after:duration-150',
            'peer-checked:after:scale-100',
          )}
        />
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
