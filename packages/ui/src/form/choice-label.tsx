import type { ReactNode } from 'react';
import { cn } from '@afaq/utils';

export interface ChoiceLabelProps {
  htmlFor: string;
  label?: ReactNode;
  description?: ReactNode;
  descriptionId: string;
  disabled: boolean;
}

/** The text beside a checkbox, radio or switch. */
export function ChoiceLabel({
  htmlFor,
  label,
  description,
  descriptionId,
  disabled,
}: ChoiceLabelProps): ReactNode {
  if (!label && !description) return null;

  return (
    <span className="min-w-0">
      {label ? (
        <label
          htmlFor={htmlFor}
          className={cn(
            'block text-body-small text-fg',
            disabled ? 'cursor-not-allowed' : 'cursor-pointer',
          )}
        >
          {label}
        </label>
      ) : null}
      {description ? (
        <span id={descriptionId} className="mt-0.5 block text-caption text-fg-muted">
          {description}
        </span>
      ) : null}
    </span>
  );
}
