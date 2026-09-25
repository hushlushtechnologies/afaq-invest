import type { ReactNode } from 'react';
import { ShowcaseSection } from './showcase-section';

const RADIUS = ['rounded-sm', 'rounded-md', 'rounded-lg', 'rounded-xl', 'rounded-2xl'] as const;

const Z_LAYERS = [
  ['z-sticky', '20'],
  ['z-dropdown', '30'],
  ['z-drawer', '40'],
  ['z-backdrop', '50'],
  ['z-modal', '60'],
  ['z-popover', '70'],
  ['z-tooltip', '80'],
  ['z-toast', '90'],
] as const;

const TRANSITIONS = ['transition-fast', 'transition-normal', 'transition-slow'] as const;

export function LayoutShowcase(): ReactNode {
  return (
    <>
      <ShowcaseSection title="Radius">
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
          {RADIUS.map((radius) => (
            <div key={radius} className="flex flex-col gap-2">
              <div className={`h-16 w-full bg-primary ${radius}`} />
              <p className="text-caption text-fg-muted">{radius}</p>
            </div>
          ))}
        </div>
      </ShowcaseSection>

      <ShowcaseSection title="Containers">
        <div className="space-y-3">
          <div className="rounded-lg border border-primary/30 bg-primary/15 py-3 text-center">
            <span className="text-caption text-fg-secondary">container-page — 80rem</span>
          </div>
          <div className="container-narrow rounded-lg border border-accent/30 bg-accent/15 py-3 text-center">
            <span className="text-caption text-fg-secondary">container-narrow — 48rem</span>
          </div>
        </div>
        <p className="mt-2 text-caption text-fg-muted">
          Side padding steps up at 640px and 1024px. Resize the window to see it.
        </p>
      </ShowcaseSection>

      <ShowcaseSection title="Z-index order">
        <div className="rounded-xl border border-border bg-surface card-padding">
          <div className="grid grid-cols-2 gap-x-6 gap-y-1 sm:grid-cols-4">
            {Z_LAYERS.map(([name, value]) => (
              <div key={name} className="flex justify-between gap-3">
                <code className="font-mono text-caption text-fg-subtle">{name}</code>
                <span className="text-caption text-numeric text-fg-muted">{value}</span>
              </div>
            ))}
          </div>
        </div>
      </ShowcaseSection>

      <ShowcaseSection title="Transitions">
        <div className="rounded-xl border border-border bg-surface card-padding">
          <div className="flex flex-wrap gap-3">
            {TRANSITIONS.map((transition) => (
              <div
                key={transition}
                className={`cursor-default rounded-lg bg-surface-hover px-4 py-3 text-body-small text-fg-secondary transition-colors hover:bg-primary hover:text-primary-foreground ${transition}`}
              >
                {transition}
              </div>
            ))}
          </div>
          <p className="mt-3 text-caption text-fg-muted">Hover each one to compare the timing.</p>
        </div>
      </ShowcaseSection>
    </>
  );
}
