import type { ComponentPropsWithRef, ReactNode } from 'react';
import { cn } from '@afaq/utils';
import { Spinner, type SpinnerSize } from '../feedback/spinner';

export type ButtonVariant =
  | 'primary'
  | 'secondary'
  | 'accent'
  | 'outline'
  | 'ghost'
  | 'danger'
  | 'success'
  | 'gradient'
  | 'gradient-outline';

export type ButtonSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl' | 'icon';

const BASE = cn(
  'relative inline-flex items-center justify-center gap-2 whitespace-nowrap select-none',
  'rounded-lg border border-transparent text-button',
  'transition-[color,background-color,border-color,box-shadow,filter,transform] duration-150 ease-out-soft',
  'outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background',
  'disabled:pointer-events-none disabled:opacity-50',
  'active:scale-[0.98]',
  '[&_svg]:shrink-0',
);

const VARIANTS: Record<ButtonVariant, string> = {
  primary: 'bg-primary text-primary-foreground hover:bg-primary-hover active:bg-primary-active',
  secondary: 'bg-secondary text-secondary-foreground hover:bg-secondary-hover',
  accent: 'bg-accent text-accent-foreground hover:bg-accent-hover',
  outline:
    'border-border-strong bg-transparent text-fg hover:border-primary hover:bg-surface-hover',
  ghost: 'bg-transparent text-fg-secondary hover:bg-surface-hover hover:text-fg',
  danger: 'bg-danger text-status-foreground hover:brightness-95',
  success: 'bg-success text-status-foreground hover:brightness-95',
  gradient: 'gradient-primary text-primary-foreground shadow-brand hover:brightness-110',
  'gradient-outline': 'gradient-outline text-fg hover:brightness-[0.97]',
};

const SIZES: Record<ButtonSize, string> = {
  xs: 'h-7 gap-1.5 px-2.5 text-xs [&_svg]:size-3.5',
  sm: 'h-8 gap-1.5 px-3 [&_svg]:size-4',
  md: 'h-9.5 px-4 [&_svg]:size-4',
  lg: 'h-11 px-5 text-[0.9375rem] [&_svg]:size-4.5',
  xl: 'h-12 gap-2.5 px-6 text-base [&_svg]:size-5',
  icon: 'size-9.5 p-0 [&_svg]:size-4',
};

const SPINNER_SIZES: Record<ButtonSize, SpinnerSize> = {
  xs: 'xs',
  sm: 'xs',
  md: 'sm',
  lg: 'md',
  xl: 'md',
  icon: 'sm',
};

export interface ButtonProps extends ComponentPropsWithRef<'button'> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  /** Shows a spinner and blocks clicks. The button keeps its width. */
  loading?: boolean;
  /** Announced to screen readers while loading. */
  loadingLabel?: string;
  /** Icon on the leading edge — left in English, right in Arabic. */
  iconStart?: ReactNode;
  /** Icon on the trailing edge — right in English, left in Arabic. */
  iconEnd?: ReactNode;
  fullWidth?: boolean;
}

export function Button({
  variant = 'primary',
  size = 'md',
  loading = false,
  loadingLabel = 'Loading',
  iconStart,
  iconEnd,
  fullWidth = false,
  disabled,
  className,
  children,
  type = 'button',
  ...props
}: ButtonProps): ReactNode {
  return (
    <button
      type={type}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={cn(BASE, VARIANTS[variant], SIZES[size], fullWidth && 'w-full', className)}
      {...props}
    >
      {/* The label stays in place but invisible while loading, so the width never changes. */}
      <span className={cn('inline-flex items-center gap-[inherit]', loading && 'invisible')}>
        {iconStart}
        {children}
        {iconEnd}
      </span>

      {loading ? (
        <span className="absolute inset-0 flex items-center justify-center">
          <Spinner size={SPINNER_SIZES[size]} label={loadingLabel} />
        </span>
      ) : null}
    </button>
  );
}
