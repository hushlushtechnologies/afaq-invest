import type { ReactNode } from 'react';
import { cn } from '@afaq/utils';

export type ProgressTone = 'primary' | 'success' | 'warning' | 'danger' | 'gradient';
export type ProgressSize = 'sm' | 'md' | 'lg';

const TONES: Record<ProgressTone, string> = {
  primary: 'bg-primary',
  success: 'bg-success',
  warning: 'bg-warning',
  danger: 'bg-danger',
  gradient: 'gradient-primary',
};

const SIZES: Record<ProgressSize, string> = { sm: 'h-1', md: 'h-2', lg: 'h-2.5' };

export interface ProgressProps {
  value: number;
  max?: number;
  tone?: ProgressTone;
  size?: ProgressSize;
  label?: string;
  /** Show the value above the bar. */
  showValue?: boolean;
  /** Custom text for the value, e.g. "AED 6.8M of AED 10M". Also read by screen readers. */
  valueText?: string;
  className?: string;
}

export function Progress({
  value,
  max = 100,
  tone = 'primary',
  size = 'md',
  label,
  showValue = false,
  valueText,
  className,
}: ProgressProps): ReactNode {
  const safeMax = max > 0 ? max : 100;
  const percent = Math.min(100, Math.max(0, (value / safeMax) * 100));
  const text = valueText ?? `${Math.round(percent)}%`;

  return (
    <div className={cn('w-full', className)}>
      {label || showValue ? (
        <div className="mb-1.5 flex items-baseline justify-between gap-3">
          {label ? <span className="text-caption text-fg-secondary">{label}</span> : null}
          {showValue ? (
            <span className="text-caption text-numeric text-fg-muted" dir="ltr">
              {text}
            </span>
          ) : null}
        </div>
      ) : null}
      <div
        role="progressbar"
        aria-label={label}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(percent)}
        aria-valuetext={text}
        className={cn('w-full overflow-hidden rounded-full bg-background-subtle', SIZES[size])}
      >
        <div
          className={cn(
            'h-full rounded-full transition-[width] duration-500 ease-out-soft',
            TONES[tone],
          )}
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  );
}
