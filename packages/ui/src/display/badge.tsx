import type { ComponentPropsWithRef, ReactNode } from 'react';
import { cn } from '@afaq/utils';

export type BadgeVariant =
  'neutral' | 'primary' | 'accent' | 'success' | 'warning' | 'danger' | 'info' | 'outline';

export type BadgeSize = 'sm' | 'md';

// Tints come from the semantic colours, so badges follow the theme automatically.
// Text uses the -strong tokens so small labels stay readable on the tinted backgrounds.
const VARIANTS: Record<BadgeVariant, string> = {
  neutral: 'border-border bg-background-subtle text-fg-secondary',
  primary: 'border-primary/25 bg-primary/12 text-primary-strong',
  accent: 'border-accent/30 bg-accent/15 text-accent-strong',
  success: 'border-success/25 bg-success-surface text-success-strong',
  warning: 'border-warning/30 bg-warning-surface text-warning-strong',
  danger: 'border-danger/25 bg-danger-surface text-danger-strong',
  info: 'border-info/25 bg-info-surface text-info-strong',
  outline: 'border-border-strong bg-transparent text-fg-secondary',
};

const SIZES: Record<BadgeSize, string> = {
  sm: 'h-5 gap-1 px-1.5 text-[0.6875rem] [&_svg]:size-3',
  md: 'h-6 gap-1.5 px-2 text-xs [&_svg]:size-3.5',
};

export interface BadgeProps extends ComponentPropsWithRef<'span'> {
  variant?: BadgeVariant;
  size?: BadgeSize;
  /** Small coloured dot before the text. */
  dot?: boolean;
  icon?: ReactNode;
}

export function Badge({
  variant = 'neutral',
  size = 'md',
  dot = false,
  icon,
  className,
  children,
  ...props
}: BadgeProps): ReactNode {
  return (
    <span
      className={cn(
        'inline-flex shrink-0 items-center rounded-full border font-medium whitespace-nowrap',
        VARIANTS[variant],
        SIZES[size],
        className,
      )}
      {...props}
    >
      {dot ? (
        <span className="size-1.5 shrink-0 rounded-full bg-current" aria-hidden="true" />
      ) : null}
      {icon}
      {children}
    </span>
  );
}
