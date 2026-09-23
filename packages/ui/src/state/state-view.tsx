import type { ReactNode } from 'react';
import { cn } from '@afaq/utils';

export type StateTone = 'neutral' | 'primary' | 'success' | 'warning' | 'danger';
export type StateSize = 'sm' | 'md' | 'lg';

const TONES: Record<StateTone, string> = {
  neutral: 'bg-background-subtle text-fg-muted',
  primary: 'bg-primary/10 text-primary',
  success: 'bg-success-surface text-success',
  warning: 'bg-warning-surface text-warning-strong',
  danger: 'bg-danger-surface text-danger',
};

const SIZES: Record<StateSize, { box: string; icon: string; title: string }> = {
  sm: { box: 'px-4 py-8', icon: 'size-9 [&_svg]:size-4.5', title: 'text-h6' },
  md: { box: 'px-6 py-14', icon: 'size-12 [&_svg]:size-5.5', title: 'text-h5' },
  lg: { box: 'px-6 py-20', icon: 'size-16 [&_svg]:size-7', title: 'text-h3' },
};

export interface StateViewProps {
  icon?: ReactNode;
  /**
   * Replaces the icon with something larger — for example a Lottie animation
   * (Phase 12). Optional, so no screen depends on an animation file.
   */
  illustration?: ReactNode;
  title: ReactNode;
  description?: ReactNode;
  /** Buttons under the text. */
  actions?: ReactNode;
  /** Extra content under the actions, e.g. technical details. */
  children?: ReactNode;
  tone?: StateTone;
  /** sm inside a card or table, md for a section, lg for a whole page. */
  size?: StateSize;
  /**
   * How screen readers hear it when it appears:
   * 'status' politely, 'alert' immediately, 'none' not at all (static content).
   */
  announce?: 'status' | 'alert' | 'none';
  className?: string;
}

/** The shared layout behind every state component: icon, title, text, actions. */
export function StateView({
  icon,
  illustration,
  title,
  description,
  actions,
  children,
  tone = 'neutral',
  size = 'md',
  announce = 'none',
  className,
}: StateViewProps): ReactNode {
  const sizing = SIZES[size];

  return (
    <div
      role={announce === 'none' ? undefined : announce}
      className={cn('flex flex-col items-center text-center', sizing.box, className)}
    >
      {illustration ? (
        <div className="mb-2">{illustration}</div>
      ) : icon ? (
        <span
          aria-hidden="true"
          className={cn('flex items-center justify-center rounded-full', sizing.icon, TONES[tone])}
        >
          {icon}
        </span>
      ) : null}
      <p className={cn('mt-4 text-fg', sizing.title)}>{title}</p>
      {description ? (
        <p className="mt-1.5 max-w-md text-body-small text-fg-subtle">{description}</p>
      ) : null}
      {actions ? <div className="mt-6 flex flex-wrap justify-center gap-3">{actions}</div> : null}
      {children ? <div className="mt-5 w-full max-w-md">{children}</div> : null}
    </div>
  );
}
