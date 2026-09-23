'use client';

import { Eye, EyeOff, Lock } from 'lucide-react';
import { useState, type ReactNode } from 'react';
import { Input, type InputProps } from './input';

export interface PasswordInputProps extends Omit<InputProps, 'type' | 'iconEnd'> {
  showLabel?: string;
  hideLabel?: string;
  /** Lock icon at the leading edge. On by default. */
  showLockIcon?: boolean;
}

export function PasswordInput({
  showLabel = 'Show password',
  hideLabel = 'Hide password',
  showLockIcon = true,
  iconStart,
  autoComplete = 'current-password',
  disabled,
  ...props
}: PasswordInputProps): ReactNode {
  const [visible, setVisible] = useState(false);
  const label = visible ? hideLabel : showLabel;

  return (
    <Input
      type={visible ? 'text' : 'password'}
      autoComplete={autoComplete}
      disabled={disabled}
      iconStart={iconStart ?? (showLockIcon ? <Lock /> : undefined)}
      iconEnd={
        <button
          type="button"
          onClick={() => setVisible((current) => !current)}
          aria-label={label}
          aria-pressed={visible}
          title={label}
          disabled={disabled}
          className="rounded p-0.5 text-fg-muted transition-colors outline-none hover:text-fg-secondary focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none"
        >
          {visible ? <EyeOff aria-hidden="true" /> : <Eye aria-hidden="true" />}
        </button>
      }
      {...props}
    />
  );
}
