import { cn } from '@afaq/utils';

export type FieldSize = 'sm' | 'md' | 'lg';
export type FieldState = 'default' | 'error' | 'success';

/** Heights shared by Input, Select and friends so they line up in a row. */
export const FIELD_HEIGHTS: Record<FieldSize, string> = {
  sm: 'h-8 text-[0.8125rem]',
  md: 'h-9.5 text-sm',
  lg: 'h-11 text-[0.9375rem]',
};

const STATE_CLASSES: Record<FieldState, string> = {
  default:
    'border-border hover:border-border-strong focus-within:border-primary focus-within:ring-ring/25',
  error: 'border-danger hover:border-danger focus-within:border-danger focus-within:ring-danger/25',
  success:
    'border-success hover:border-success focus-within:border-success focus-within:ring-success/25',
};

/**
 * The bordered box around a control. The focus ring sits on this box (not the
 * inner input), so icons and buttons inside it look like one control.
 */
export function fieldShell(options: {
  state: FieldState;
  disabled?: boolean;
  readOnly?: boolean;
  className?: string;
}): string {
  return cn(
    'flex w-full items-center rounded-lg border bg-surface',
    'transition-[border-color,box-shadow] duration-150 ease-out-soft focus-within:ring-3',
    STATE_CLASSES[options.state],
    options.readOnly && 'bg-background-subtle',
    options.disabled && 'cursor-not-allowed opacity-60 hover:border-border',
    options.className,
  );
}

/** The bare control inside the shell — no border or ring of its own. */
export const FIELD_CONTROL = cn(
  'w-full min-w-0 border-0 bg-transparent px-3 text-fg outline-none',
  'placeholder:text-fg-muted disabled:cursor-not-allowed',
);

export function resolveFieldState(error: unknown, success: boolean | undefined): FieldState {
  if (error) return 'error';
  if (success) return 'success';
  return 'default';
}
