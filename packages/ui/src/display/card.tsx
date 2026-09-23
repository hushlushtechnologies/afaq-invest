import type { ComponentPropsWithRef, ReactNode } from 'react';
import { cn } from '@afaq/utils';

export type CardVariant = 'flat' | 'outline' | 'elevated' | 'highlight';
export type CardPadding = 'none' | 'sm' | 'md' | 'lg';

const VARIANTS: Record<CardVariant, string> = {
  /** Tinted, no border — grouping and low emphasis. */
  flat: 'bg-background-subtle',
  /** Border, no shadow — the default for most content. */
  outline: 'border border-border bg-surface',
  /** Soft shadow, no border — content that genuinely floats. */
  elevated: 'bg-surface-elevated shadow-card',
  /** Gradient with an emerald edge — one featured item per screen. */
  highlight: 'gradient-highlight border border-primary/25',
};

const PADDING: Record<CardPadding, string> = {
  none: '',
  sm: 'p-4',
  md: 'card-padding',
  lg: 'p-6 lg:p-8',
};

export interface CardProps extends ComponentPropsWithRef<'div'> {
  variant?: CardVariant;
  padding?: CardPadding;
  /** Adds a hover lift. Only use when the whole card is clickable. */
  interactive?: boolean;
}

export function Card({
  variant = 'outline',
  padding = 'md',
  interactive = false,
  className,
  children,
  ...props
}: CardProps): ReactNode {
  return (
    <div
      className={cn(
        'rounded-xl',
        VARIANTS[variant],
        PADDING[padding],
        interactive &&
          'cursor-pointer transition-[transform,box-shadow,border-color] duration-200 ease-out-soft hover:-translate-y-0.5 hover:border-border-strong hover:shadow-elevated',
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}

export interface CardHeaderProps extends Omit<ComponentPropsWithRef<'div'>, 'title'> {
  title: ReactNode;
  description?: ReactNode;
  /** Small label above the title, e.g. the sector. */
  eyebrow?: ReactNode;
  /** A button or badge on the trailing side. */
  action?: ReactNode;
}

export function CardHeader({
  title,
  description,
  eyebrow,
  action,
  className,
  ...props
}: CardHeaderProps): ReactNode {
  return (
    <div className={cn('flex items-start justify-between gap-4', className)} {...props}>
      <div className="min-w-0">
        {eyebrow ? <p className="mb-1.5 text-overline text-primary">{eyebrow}</p> : null}
        <h3 className="text-h5 text-fg">{title}</h3>
        {description ? <p className="mt-1 text-body-small text-fg-subtle">{description}</p> : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}

export function CardBody({ className, ...props }: ComponentPropsWithRef<'div'>): ReactNode {
  return <div className={cn('mt-4', className)} {...props} />;
}

export function CardFooter({ className, ...props }: ComponentPropsWithRef<'div'>): ReactNode {
  return (
    <div
      className={cn(
        'mt-5 flex flex-wrap items-center gap-3 border-t border-border-subtle pt-4',
        className,
      )}
      {...props}
    />
  );
}
