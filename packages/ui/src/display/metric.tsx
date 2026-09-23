import { TrendingDown, TrendingUp } from 'lucide-react';
import type { ReactNode } from 'react';
import { cn } from '@afaq/utils';

export type MetricSize = 'sm' | 'md' | 'lg';

export interface MetricTrend {
  /** Percentage change, e.g. 12.4 or -3.1. */
  value: number;
  label?: string;
  /** Set to false where a rise is bad news — e.g. a default rate. */
  positiveIsGood?: boolean;
}

export interface MetricProps {
  label: string;
  value: ReactNode;
  unit?: string;
  trend?: MetricTrend;
  size?: MetricSize;
  className?: string;
}

const VALUE_SIZES: Record<MetricSize, string> = {
  sm: 'text-numeric text-lg',
  md: 'text-numeric text-2xl',
  lg: 'text-numeric-large',
};

export function Metric({
  label,
  value,
  unit,
  trend,
  size = 'md',
  className,
}: MetricProps): ReactNode {
  const rising = trend ? trend.value >= 0 : false;
  const good = trend ? rising === (trend.positiveIsGood ?? true) : false;
  const TrendIcon = rising ? TrendingUp : TrendingDown;

  return (
    <div className={cn('min-w-0', className)}>
      <p className="truncate text-caption text-fg-muted">{label}</p>

      <div className="mt-1.5 flex flex-wrap items-baseline gap-x-1.5 gap-y-1">
        <span className={cn(VALUE_SIZES[size], 'text-fg')} dir="ltr">
          {value}
        </span>
        {unit ? <span className="text-caption text-fg-muted">{unit}</span> : null}
      </div>

      {trend ? (
        <div className="mt-2 flex items-center gap-1.5">
          <span
            className={cn(
              'inline-flex items-center gap-1 text-xs font-medium',
              good ? 'text-success-strong' : 'text-danger-strong',
            )}
          >
            <TrendIcon className="size-3.5" aria-hidden="true" />
            <span dir="ltr">
              {rising ? '+' : ''}
              {trend.value}%
            </span>
          </span>
          {trend.label ? (
            <span className="truncate text-caption text-fg-muted">{trend.label}</span>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
