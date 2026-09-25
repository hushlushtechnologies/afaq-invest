'use client';

import { ArrowRight, Download, Plus, Save, Trash2 } from 'lucide-react';
import { useState, type ReactNode } from 'react';
import { Button, ButtonGroup, IconButton, type ButtonSize, type ButtonVariant } from '@afaq/ui';
import { ShowcaseSection } from './showcase-section';

const VARIANTS: ButtonVariant[] = [
  'primary',
  'secondary',
  'accent',
  'outline',
  'ghost',
  'danger',
  'success',
  'gradient',
  'gradient-outline',
];

const SIZES: ButtonSize[] = ['xs', 'sm', 'md', 'lg', 'xl'];

function Row({ title, children }: { title: string; children: ReactNode }): ReactNode {
  return (
    <div>
      <p className="mb-3 font-mono text-caption text-fg-muted">{title}</p>
      <div className="flex flex-wrap items-center gap-3">{children}</div>
    </div>
  );
}

function Panel({ children }: { children: ReactNode }): ReactNode {
  return (
    <div className="space-y-6 rounded-xl border border-border bg-surface card-padding">
      {children}
    </div>
  );
}

export function ButtonShowcase(): ReactNode {
  const [loadingId, setLoadingId] = useState<string | null>(null);

  function simulate(id: string): void {
    setLoadingId(id);
    window.setTimeout(() => setLoadingId(null), 1600);
  }

  return (
    <>
      <ShowcaseSection title="Buttons — variants">
        <Panel>
          <Row title="default">
            {VARIANTS.map((variant) => (
              <Button key={variant} variant={variant}>
                {variant}
              </Button>
            ))}
          </Row>
          <Row title="disabled">
            {VARIANTS.map((variant) => (
              <Button key={variant} variant={variant} disabled>
                {variant}
              </Button>
            ))}
          </Row>
        </Panel>
      </ShowcaseSection>

      <ShowcaseSection title="Buttons — sizes">
        <Panel>
          <Row title="text">
            {SIZES.map((size) => (
              <Button key={size} size={size}>
                Size {size}
              </Button>
            ))}
          </Row>
          <Row title="with icon">
            {SIZES.map((size) => (
              <Button key={size} size={size} variant="outline" iconStart={<Plus />}>
                Add
              </Button>
            ))}
          </Row>
        </Panel>
      </ShowcaseSection>

      <ShowcaseSection title="Buttons — icons">
        <Panel>
          <Row title="iconStart / iconEnd — swap sides in Arabic">
            <Button iconStart={<Save />}>Save changes</Button>
            <Button variant="outline" iconEnd={<ArrowRight className="rtl:rotate-180" />}>
              Continue
            </Button>
            <Button
              variant="gradient"
              iconStart={<Download />}
              iconEnd={<ArrowRight className="rtl:rotate-180" />}
            >
              Export report
            </Button>
          </Row>
          <Row title="icon only — label required">
            <IconButton icon={<Plus />} label="Add investor" />
            <IconButton icon={<Save />} label="Save" variant="outline" />
            <IconButton icon={<Trash2 />} label="Delete" variant="danger" />
          </Row>
        </Panel>
      </ShowcaseSection>

      <ShowcaseSection title="Buttons — loading">
        <Panel>
          <Row title="click to simulate — the width must not change">
            <Button
              data-testid="loading-demo"
              loading={loadingId === 'save'}
              onClick={() => simulate('save')}
              iconStart={<Save />}
            >
              Save changes
            </Button>
            <Button
              variant="gradient"
              loading={loadingId === 'submit'}
              onClick={() => simulate('submit')}
            >
              Submit investment
            </Button>
            <Button variant="outline" loading>
              Always loading
            </Button>
            <IconButton icon={<Save />} label="Save" variant="outline" loading />
          </Row>
        </Panel>
      </ShowcaseSection>

      <ShowcaseSection title="Buttons — groups and full width">
        <Panel>
          <Row title="ButtonGroup">
            <ButtonGroup label="View mode">
              <Button variant="outline" size="sm">
                Day
              </Button>
              <Button variant="outline" size="sm">
                Week
              </Button>
              <Button variant="outline" size="sm">
                Month
              </Button>
            </ButtonGroup>
          </Row>
          <div className="max-w-sm space-y-2">
            <p className="font-mono text-caption text-fg-muted">fullWidth</p>
            <Button fullWidth variant="gradient" iconStart={<Plus />}>
              Create opportunity
            </Button>
            <Button fullWidth variant="outline">
              Cancel
            </Button>
          </div>
        </Panel>
      </ShowcaseSection>
    </>
  );
}
