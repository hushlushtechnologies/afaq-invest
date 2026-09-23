import type { ReactNode } from 'react';
import { cn } from '@afaq/utils';
import { Card, type CardVariant } from './card';
import { Metric, type MetricProps } from './metric';

export interface StatCardProps extends Omit<MetricProps, 'className' | 'size'> {
  icon?: ReactNode;
  variant?: CardVariant;
  footer?: ReactNode;
  className?: string;
}

/** A headline figure in a card — the building block of dashboards. */
export function StatCard({
  icon,
  variant = 'outline',
  footer,
  className,
  ...metric
}: StatCardProps): ReactNode {
  return (
    <Card variant={variant} className={cn('flex flex-col', className)}>
      <div className="flex items-start justify-between gap-3">
        <Metric {...metric} />
        {icon ? (
          <span
            className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary [&_svg]:size-4.5"
            aria-hidden="true"
          >
            {icon}
          </span>
        ) : null}
      </div>
      {footer ? (
        <div className="mt-4 border-t border-border-subtle pt-3 text-caption text-fg-muted">
          {footer}
        </div>
      ) : null}
    </Card>
  );
}
