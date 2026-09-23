import { Check } from 'lucide-react';
import type { ReactNode } from 'react';
import { cn } from '@afaq/utils';

export interface StepperStep {
  label: ReactNode;
  description?: ReactNode;
}

export interface StepperProps {
  steps: readonly StepperStep[];
  /** Index of the current step, starting at 0. */
  current: number;
  orientation?: 'horizontal' | 'vertical';
  label?: string;
  className?: string;
}

/**
 * Shows progress through a multi-step process — investor onboarding, KYC,
 * creating an opportunity. Horizontal steppers stack vertically on phones.
 */
export function Stepper({
  steps,
  current,
  orientation = 'horizontal',
  label = 'Progress',
  className,
}: StepperProps): ReactNode {
  const horizontal = orientation === 'horizontal';

  return (
    <ol
      aria-label={label}
      className={cn(
        'flex',
        horizontal ? 'flex-col gap-4 sm:flex-row sm:gap-0' : 'flex-col',
        className,
      )}
    >
      {steps.map((step, index) => {
        const state = index < current ? 'complete' : index === current ? 'current' : 'upcoming';
        const last = index === steps.length - 1;

        return (
          <li
            key={index}
            aria-current={state === 'current' ? 'step' : undefined}
            className={cn('relative flex gap-3', horizontal && 'sm:flex-1 sm:flex-col sm:gap-2')}
          >
            {/* The connecting line to the next step. */}
            {!last ? (
              <span
                aria-hidden="true"
                className={cn(
                  'absolute bg-border',
                  state === 'complete' && 'bg-primary',
                  horizontal
                    ? 'start-4 top-9 bottom-[-1rem] w-px sm:start-10 sm:end-2 sm:top-4 sm:bottom-auto sm:h-px sm:w-auto'
                    : 'start-4 top-9 -bottom-1 w-px',
                )}
              />
            ) : null}

            <span
              className={cn(
                'relative flex size-8 shrink-0 items-center justify-center rounded-full border-2 text-xs font-semibold',
                state === 'complete' && 'border-primary bg-primary text-primary-foreground',
                state === 'current' &&
                  'border-primary bg-surface text-primary-strong ring-4 ring-primary/15',
                state === 'upcoming' && 'border-border-strong bg-surface text-fg-muted',
              )}
            >
              {state === 'complete' ? (
                <Check className="size-4" strokeWidth={3} aria-hidden="true" />
              ) : (
                index + 1
              )}
            </span>

            <span
              className={cn(
                'min-w-0 pt-1',
                horizontal && 'sm:pe-4 sm:pt-0',
                !horizontal && !last && 'pb-6',
              )}
            >
              <span
                className={cn(
                  'block text-label',
                  state === 'upcoming' ? 'text-fg-subtle' : 'text-fg',
                )}
              >
                {step.label}
                <span className="sr-only">
                  {state === 'complete'
                    ? ' — completed'
                    : state === 'current'
                      ? ' — current step'
                      : ''}
                </span>
              </span>
              {step.description ? (
                <span className="mt-0.5 block text-caption text-fg-muted">{step.description}</span>
              ) : null}
            </span>
          </li>
        );
      })}
    </ol>
  );
}
