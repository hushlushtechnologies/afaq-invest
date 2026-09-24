'use client';

import type { AppTheme } from '../hooks/use-app-theme';
import { useAppTheme } from '../hooks/use-app-theme';

export interface ThemeSelectorProps {
  className?: string;
  groupLabel?: string;
}

const themeOptions: Array<{
  value: AppTheme;
  label: string;
}> = [
  {
    value: 'light',
    label: 'Light',
  },
  {
    value: 'dark',
    label: 'Dark',
  },
  {
    value: 'system',
    label: 'System',
  },
];

export function ThemeSelector({ className = '', groupLabel = 'Select theme' }: ThemeSelectorProps) {
  const { mounted, theme, setTheme } = useAppTheme();

  if (!mounted) {
    return <div className={`bg-muted h-10 w-full animate-pulse rounded-lg ${className}`} />;
  }

  return (
    <div className={className}>
      {groupLabel ? <p className="text-foreground mb-2 text-sm font-medium">{groupLabel}</p> : null}

      <div
        className="bg-muted/50 inline-flex items-center gap-1 rounded-lg border border-border p-1"
        role="group"
        aria-label={groupLabel}
      >
        {themeOptions.map((option) => {
          const active = theme === option.value;

          return (
            <button
              key={option.value}
              type="button"
              onClick={() => setTheme(option.value)}
              aria-pressed={active}
              className={[
                'rounded-md px-3 py-1.5 text-sm font-medium',
                'transition-colors',
                'focus-visible:outline-none',
                'focus-visible:ring-2',
                'focus-visible:ring-ring',
                active
                  ? 'text-foreground bg-background shadow-sm'
                  : 'text-muted-foreground hover:text-foreground',
              ].join(' ')}
            >
              {option.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
