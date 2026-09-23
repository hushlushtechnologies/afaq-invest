import type { ReactNode } from 'react';
import { Button, type ButtonProps } from './button';

export interface IconButtonProps extends Omit<ButtonProps, 'iconStart' | 'iconEnd' | 'children'> {
  icon: ReactNode;
  /** Required — an icon alone gives screen readers nothing to announce. */
  label: string;
}

export function IconButton({
  icon,
  label,
  size = 'icon',
  variant = 'ghost',
  ...props
}: IconButtonProps): ReactNode {
  return (
    <Button size={size} variant={variant} aria-label={label} title={label} {...props}>
      {icon}
    </Button>
  );
}
