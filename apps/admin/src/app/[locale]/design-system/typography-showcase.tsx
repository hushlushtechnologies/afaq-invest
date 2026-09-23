import type { ReactNode } from 'react';
import { ShowcaseSection } from './showcase-section';

const SCALE = [
  ['text-display', 'Afaq Invest'],
  ['text-h1', 'Investment opportunities'],
  ['text-h2', 'Portfolio overview'],
  ['text-h3', 'Recent distributions'],
  ['text-h4', 'Quarterly summary'],
  ['text-h5', 'Section heading'],
  ['text-h6', 'Minor heading'],
  ['text-body-large', 'Introductory paragraph text for lead copy.'],
  ['text-body', 'Default body text for descriptions and general content.'],
  ['text-body-small', 'Secondary body text for supporting detail.'],
  ['text-label', 'Form field label'],
  ['text-caption', 'Caption or helper text'],
  ['text-overline', 'Overline label'],
  ['text-button', 'Button label'],
] as const;

const FIGURES = ['1,250,000.00', '9,880,140.50', '11,111,111.11', '78,900.05'] as const;

export function TypographyShowcase(): ReactNode {
  return (
    <>
      <ShowcaseSection title="Type scale">
        <div className="space-y-5 rounded-xl border border-border bg-surface card-padding">
          {SCALE.map(([utility, sample]) => (
            <div key={utility} className="flex flex-wrap items-baseline gap-x-5 gap-y-1">
              <code className="w-36 shrink-0 font-mono text-caption text-fg-muted">{utility}</code>
              <span className={`${utility} min-w-0 text-fg`}>{sample}</span>
            </div>
          ))}
        </div>
      </ShowcaseSection>

      <ShowcaseSection title="Numeric — tabular figures">
        <div className="rounded-xl border border-border bg-surface card-padding">
          <p className="text-numeric-large text-fg" dir="ltr">
            AED 12,480,000.00
          </p>
          <div className="mt-5 max-w-xs space-y-1" dir="ltr">
            {FIGURES.map((value) => (
              <div key={value} className="flex justify-between">
                <span className="text-body-small text-fg-subtle">Row</span>
                <span className="text-numeric text-fg">{value}</span>
              </div>
            ))}
          </div>
          <p className="mt-4 text-caption text-fg-muted">
            Every digit is the same width, so decimal points line up down the column.
          </p>
        </div>
      </ShowcaseSection>

      <ShowcaseSection title="Text colour hierarchy">
        <div className="space-y-2 rounded-xl border border-border bg-surface card-padding">
          <p className="text-body text-fg">text-primary — main content</p>
          <p className="text-body text-fg-secondary">text-secondary — supporting content</p>
          <p className="text-body text-fg-subtle">text-subtle — descriptions</p>
          <p className="text-body text-fg-muted">text-muted — least emphasis</p>
          <p className="text-body text-primary">text-accent — emerald emphasis</p>
          <p className="inline-block rounded bg-fg px-2 py-1 text-body text-fg-inverse">
            text-inverse — on dark
          </p>
        </div>
      </ShowcaseSection>

      <ShowcaseSection title="Arabic">
        <div
          className="rounded-xl border border-border bg-surface card-padding"
          dir="rtl"
          lang="ar"
        >
          <p className="text-h3 text-fg">آفاق إنفست</p>
          <p className="mt-3 text-body text-fg-secondary">
            منصة إدارة الاستثمارات لشركة آفاق البركة للاستثمار
          </p>
        </div>
        <p className="mt-2 text-caption text-fg-muted">
          Open /ar/design-system to see the Arabic font and spacing applied to the whole page.
        </p>
      </ShowcaseSection>
    </>
  );
}
