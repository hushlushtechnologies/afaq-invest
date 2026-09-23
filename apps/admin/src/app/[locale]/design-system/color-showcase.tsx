import type { ReactNode } from 'react';
import { ShowcaseSection } from './showcase-section';

interface SwatchProps {
  label: string;
  className: string;
  note?: string;
}

function Swatch({ label, className, note }: SwatchProps): ReactNode {
  return (
    <div className="flex flex-col gap-2">
      <div className={`h-16 w-full rounded-lg border border-border ${className}`} />
      <div>
        <p className="text-caption font-medium text-fg">{label}</p>
        {note ? <p className="text-caption text-fg-muted">{note}</p> : null}
      </div>
    </div>
  );
}

function Grid({ children }: { children: ReactNode }): ReactNode {
  return <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">{children}</div>;
}

const SHADOWS = [
  'shadow-subtle',
  'shadow-card',
  'shadow-elevated',
  'shadow-overlay',
  'shadow-brand',
] as const;

export function ColorShowcase(): ReactNode {
  return (
    <>
      <ShowcaseSection title="Brand">
        <Grid>
          <Swatch label="primary" className="bg-primary" />
          <Swatch label="primary-hover" className="bg-primary-hover" />
          <Swatch label="primary-active" className="bg-primary-active" />
          <Swatch label="secondary" className="bg-secondary" />
          <Swatch label="secondary-hover" className="bg-secondary-hover" />
          <Swatch label="accent" className="bg-accent" note="restrained gold" />
          <Swatch label="accent-hover" className="bg-accent-hover" />
        </Grid>
      </ShowcaseSection>

      <ShowcaseSection title="Background & surface">
        <Grid>
          <Swatch label="background" className="bg-background" />
          <Swatch label="background-subtle" className="bg-background-subtle" />
          <Swatch label="surface" className="bg-surface" />
          <Swatch label="surface-elevated" className="bg-surface-elevated shadow-elevated" />
          <Swatch label="surface-hover" className="bg-surface-hover" />
        </Grid>
      </ShowcaseSection>

      <ShowcaseSection title="Border">
        <Grid>
          <Swatch label="border-subtle" className="border-4 border-border-subtle bg-surface" />
          <Swatch label="border" className="border-4 border-border bg-surface" />
          <Swatch label="border-strong" className="border-4 border-border-strong bg-surface" />
        </Grid>
      </ShowcaseSection>

      <ShowcaseSection title="Status">
        <Grid>
          <Swatch label="success" className="bg-success" />
          <Swatch label="warning" className="bg-warning" />
          <Swatch label="danger" className="bg-danger" />
          <Swatch label="info" className="bg-info" />
          <Swatch label="success-surface" className="bg-success-surface" />
          <Swatch label="warning-surface" className="bg-warning-surface" />
          <Swatch label="danger-surface" className="bg-danger-surface" />
          <Swatch label="info-surface" className="bg-info-surface" />
        </Grid>
      </ShowcaseSection>

      <ShowcaseSection title="Coloured text — the -strong tokens">
        <div className="grid grid-cols-2 gap-3 rounded-xl border border-border bg-surface card-padding sm:grid-cols-3">
          <p className="text-body-small font-medium text-primary-strong">primary-strong</p>
          <p className="text-body-small font-medium text-accent-strong">accent-strong</p>
          <p className="text-body-small font-medium text-success-strong">success-strong</p>
          <p className="text-body-small font-medium text-warning-strong">warning-strong</p>
          <p className="text-body-small font-medium text-danger-strong">danger-strong</p>
          <p className="text-body-small font-medium text-info-strong">info-strong</p>
        </div>
        <p className="mt-2 text-caption text-fg-muted">
          Use these whenever a status colour is used for small text. The plain colours are for
          fills, icons and borders.
        </p>
      </ShowcaseSection>

      <ShowcaseSection title="Sidebar — identical in both themes">
        <div className="rounded-xl border border-sidebar-border bg-sidebar-background card-padding">
          <p className="text-overline text-sidebar-active">Afaq Invest</p>
          <p className="mt-3 text-body-small text-sidebar-text">sidebar-text</p>
          <p className="text-body-small text-sidebar-text-muted">sidebar-text-muted</p>
          <div className="mt-4 space-y-1">
            <div className="rounded-md gradient-ghost px-3 py-2 text-body-small text-sidebar-active">
              Active item
            </div>
            <div className="rounded-md bg-sidebar-hover px-3 py-2 text-body-small text-sidebar-text">
              Hover item
            </div>
          </div>
        </div>
      </ShowcaseSection>

      <ShowcaseSection title="Gradients">
        <Grid>
          <Swatch label="gradient-primary" className="gradient-primary" />
          <Swatch label="gradient-secondary" className="gradient-secondary" />
          <Swatch label="gradient-accent" className="gradient-accent" />
          <Swatch label="gradient-ghost" className="gradient-ghost" />
          <Swatch label="gradient-surface" className="gradient-surface" />
          <Swatch label="gradient-highlight" className="gradient-highlight" />
          <Swatch label="gradient-outline" className="gradient-outline" />
        </Grid>
      </ShowcaseSection>

      <ShowcaseSection title="Shadows">
        <div className="grid grid-cols-2 gap-6 sm:grid-cols-3 lg:grid-cols-5">
          {SHADOWS.map((shadow) => (
            <div key={shadow} className="flex flex-col gap-2">
              <div className={`h-16 w-full rounded-lg bg-surface ${shadow}`} />
              <p className="text-caption text-fg-muted">{shadow}</p>
            </div>
          ))}
        </div>
      </ShowcaseSection>
    </>
  );
}
