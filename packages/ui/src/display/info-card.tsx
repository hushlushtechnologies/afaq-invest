import { AlertTriangle, CheckCircle2, Info, XCircle, type LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';
import { cn } from '@afaq/utils';

export type InfoCardTone = 'info' | 'success' | 'warning' | 'danger' | 'neutral';

const TONES: Record<InfoCardTone, { box: string; icon: string; Icon: LucideIcon }> = {
  info: { box: 'border-info/25 bg-info-surface', icon: 'text-info', Icon: Info },
  success: {
    box: 'border-success/25 bg-success-surface',
    icon: 'text-success',
    Icon: CheckCircle2,
  },
  warning: {
    box: 'border-warning/30 bg-warning-surface',
    icon: 'text-warning',
    Icon: AlertTriangle,
  },
  danger: { box: 'border-danger/25 bg-danger-surface', icon: 'text-danger', Icon: XCircle },
  neutral: { box: 'border-border bg-background-subtle', icon: 'text-fg-subtle', Icon: Info },
};

export interface InfoCardProps {
  tone?: InfoCardTone;
  title?: ReactNode;
  children: ReactNode;
  /** Replaces the default icon for the tone. */
  icon?: ReactNode;
  action?: ReactNode;
  /**
   * Announce to screen readers the moment it appears. Use only for messages
   * that appear in response to something the person did, not for static notes.
   */
  announce?: boolean;
  className?: string;
}

/** A coloured notice: information, success, warning or error. */
export function InfoCard({
  tone = 'info',
  title,
  children,
  icon,
  action,
  announce = false,
  className,
}: InfoCardProps): ReactNode {
  const { box, icon: iconClass, Icon } = TONES[tone];

  return (
    <div
      role={announce ? 'alert' : 'note'}
      className={cn('flex gap-3 rounded-xl border p-4', box, className)}
    >
      <span className={cn('mt-0.5 shrink-0 [&_svg]:size-4.5', iconClass)} aria-hidden="true">
        {icon ?? <Icon />}
      </span>
      <div className="min-w-0 flex-1">
        {title ? <p className="text-h6 text-fg">{title}</p> : null}
        <div className={cn('text-body-small text-fg-secondary', title ? 'mt-1' : '')}>
          {children}
        </div>
        {action ? <div className="mt-3">{action}</div> : null}
      </div>
    </div>
  );
}
