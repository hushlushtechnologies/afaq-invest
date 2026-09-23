'use client';

import { useId, type ComponentPropsWithRef, type ReactNode } from 'react';
import { cn } from '@afaq/utils';
import { ChoiceLabel } from './choice-label';
import { useFormField } from './form-field-context';

export interface SwitchProps extends Omit<ComponentPropsWithRef<'input'>, 'type' | 'size'> {
  label?: ReactNode;
  description?: ReactNode;
  switchSize?: 'sm' | 'md';
  /** 'start' puts the text first and the switch at the far end — the settings-row layout. */
  labelPosition?: 'start' | 'end';
  wrapperClassName?: string;
}

const TRACK = { sm: 'h-5 w-9', md: 'h-6 w-11' } as const;

// The thumb travels the other way in Arabic.
const THUMB = {
  sm: 'size-4 peer-checked:translate-x-4 rtl:peer-checked:-translate-x-4',
  md: 'size-5 peer-checked:translate-x-5 rtl:peer-checked:-translate-x-5',
} as const;

/** An on/off setting. Screen readers announce it as "switch, on / off". */
export function Switch({
  label,
  description,
  switchSize = 'md',
  labelPosition = 'end',
  wrapperClassName,
  className,
  id,
  disabled,
  ...props
}: SwitchProps): ReactNode {
  const field = useFormField();
  const generatedId = useId();

  const inputId = id ?? field?.controlId ?? generatedId;
  const descriptionId = `${inputId}-choice-description`;
  const isDisabled = disabled ?? field?.disabled ?? false;

  return (
    <div
      className={cn(
        'flex items-start gap-3',
        labelPosition === 'start' && 'flex-row-reverse justify-between',
        isDisabled && 'opacity-60',
        wrapperClassName,
      )}
    >
      <span className={cn('relative inline-flex shrink-0 items-center', TRACK[switchSize])}>
        <input
          id={inputId}
          type="checkbox"
          role="switch"
          disabled={isDisabled}
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
            'absolute inset-0 rounded-full bg-border-strong transition-colors duration-200',
            'peer-checked:bg-primary',
            'peer-focus-visible:ring-2 peer-focus-visible:ring-ring peer-focus-visible:ring-offset-2 peer-focus-visible:ring-offset-background',
          )}
        />
        <span
          aria-hidden="true"
          className={cn(
            'pointer-events-none absolute start-0.5 rounded-full bg-white shadow-subtle',
            'transition-transform duration-200 ease-out-soft',
            THUMB[switchSize],
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
