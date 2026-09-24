'use client';

import { Moon, Sun } from 'lucide-react';
import type { ReactNode } from 'react';
import { IconButton } from '../button/icon-button';
import { useAppTheme } from '../hooks/use-app-theme';

export interface ThemeToggleProps {
  className?: string;
  /** Accessible label. Pass a translated string where available. */
  label?: string;
}

export function ThemeToggle({ className, label = 'Toggle theme' }: ThemeToggleProps): ReactNode {
  const { resolved, toggle, mounted } = useAppTheme();

  const icon = !mounted ? (
    <span className="size-4" aria-hidden="true" />
  ) : resolved === 'dark' ? (
    <Sun aria-hidden="true" />
  ) : (
    <Moon aria-hidden="true" />
  );

  return (
    <IconButton
      icon={icon}
      size="sm"
      label={label}
      variant="outline"
      onClick={toggle}
      className={className}
    />
  );
}
