'use client';

import { useSyncExternalStore } from 'react';
import { Check, Monitor, Moon, Sun } from 'lucide-react';
import { useTheme } from 'next-themes';

const emptySubscribe = () => () => {};

export function ThemeTester() {
  const { theme, setTheme, resolvedTheme } = useTheme();

  const mounted = useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false,
  );

  if (!mounted) {
    return null;
  }

  const themes = [
    {
      value: 'light',
      label: 'Light',
      description: 'Light interface',
      icon: Sun,
    },
    {
      value: 'dark',
      label: 'Dark',
      description: 'Dark interface',
      icon: Moon,
    },
    {
      value: 'system',
      label: 'System',
      description: 'Use device preference',
      icon: Monitor,
    },
  ];

  return (
    <section className="space-y-6">
      <div>
        <h2 className="text-foreground text-xl font-semibold">Theme</h2>

        <p className="text-muted-foreground mt-1 text-sm">
          Test the Admin portal appearance across light, dark and system themes.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        {themes.map((item) => {
          const Icon = item.icon;
          const active = theme === item.value;

          return (
            <button
              key={item.value}
              type="button"
              onClick={() => setTheme(item.value)}
              className={[
                'relative rounded-xl border p-4 text-left transition-all',
                'hover:border-primary/50 hover:bg-accent/50',
                active ? 'border-primary bg-primary/5' : 'bg-card border-border',
              ].join(' ')}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="flex size-10 items-center justify-center rounded-lg border border-border bg-background">
                    <Icon className="text-foreground size-5" />
                  </div>

                  <div>
                    <p className="text-foreground font-medium">{item.label}</p>

                    <p className="text-muted-foreground mt-1 text-xs">{item.description}</p>
                  </div>
                </div>

                {active && (
                  <div className="flex size-5 items-center justify-center rounded-full bg-primary text-primary-foreground">
                    <Check className="size-3.5" />
                  </div>
                )}
              </div>
            </button>
          );
        })}
      </div>

      <div className="bg-card rounded-xl border border-border p-5">
        <div className="flex flex-wrap items-center gap-3">
          <span className="text-muted-foreground text-sm">Selected theme:</span>

          <span className="bg-muted text-foreground rounded-md px-2.5 py-1 text-sm font-medium">
            {theme ?? 'system'}
          </span>

          <span className="text-muted-foreground text-sm">Resolved theme:</span>

          <span className="bg-muted text-foreground rounded-md px-2.5 py-1 text-sm font-medium">
            {resolvedTheme ?? 'system'}
          </span>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <PreviewCard title="Background" className="text-foreground bg-background" />

        <PreviewCard title="Card" className="bg-card text-card-foreground" />

        <PreviewCard title="Muted" className="bg-muted text-muted-foreground" />

        <PreviewCard title="Primary" className="bg-primary text-primary-foreground" />
      </div>
    </section>
  );
}

function PreviewCard({ title, className }: { title: string; className: string }) {
  return (
    <div
      className={`flex min-h-28 items-center justify-center rounded-xl border border-border p-4 ${className}`}
    >
      <span className="text-sm font-medium">{title}</span>
    </div>
  );
}
