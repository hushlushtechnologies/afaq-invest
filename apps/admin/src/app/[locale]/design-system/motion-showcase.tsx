'use client';

import { motion, useReducedMotion } from 'framer-motion';
import { RotateCcw } from 'lucide-react';
import { useState, type ReactNode } from 'react';
import {
  Badge,
  Button,
  ButtonGroup,
  Card,
  PageTransition,
  Reveal,
  Stagger,
  StaggerItem,
  cardHover,
  useIsRtl,
  useMounted,
  type RevealProps,
} from '@afaq/ui';
import { ShowcaseSection } from './showcase-section';

const REVEALS: NonNullable<RevealProps['preset']>[] = [
  'fade',
  'fadeUp',
  'fadeDown',
  'scale',
  'slideFromStart',
  'slideFromEnd',
];

const LIST = [
  'Emerald Tower',
  'Marina Residences',
  'Al Jaddaf Offices',
  'Palm Hospitality',
  'Garage Expansion',
];

export function MotionShowcase(): ReactNode {
  const [replay, setReplay] = useState(0);
  const [pageKey, setPageKey] = useState<'overview' | 'holdings'>('overview');
  // The server can't know the visitor's motion setting, so the badge waits until
  // the page is running in the browser — otherwise server and browser text differ.
  const mounted = useMounted();
  const reduced = useReducedMotion();
  const rtl = useIsRtl();

  return (
    <ShowcaseSection title="Motion presets">
      <div className="space-y-4">
        <Card className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-body-small text-fg-secondary">
            Reduced motion:{' '}
            <Badge
              size="sm"
              variant={mounted && reduced ? 'warning' : 'neutral'}
              data-testid="reduced-motion"
            >
              {!mounted ? '…' : reduced ? 'on — fades only' : 'off'}
            </Badge>{' '}
            · Direction:{' '}
            <Badge size="sm" variant="neutral">
              {!mounted ? '…' : rtl ? 'right to left' : 'left to right'}
            </Badge>
          </p>
          <Button
            variant="outline"
            size="sm"
            iconStart={<RotateCcw />}
            onClick={() => setReplay((key) => key + 1)}
          >
            Replay all
          </Button>
        </Card>

        <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-6">
          {REVEALS.map((preset) => (
            <div key={preset} className="rounded-xl border border-border bg-surface p-4">
              <p className="mb-3 font-mono text-caption text-fg-muted">{preset}</p>
              <Reveal key={replay} preset={preset}>
                <div
                  className="h-14 rounded-lg gradient-primary"
                  data-testid={`reveal-${preset}`}
                />
              </Reveal>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <Card>
            <p className="mb-3 font-mono text-caption text-fg-muted">Stagger + StaggerItem</p>
            <Stagger key={replay} as="ul" className="space-y-2">
              {LIST.map((item) => (
                <StaggerItem key={item} as="li">
                  <span className="block rounded-lg bg-background-subtle px-3 py-2 text-body-small text-fg-secondary">
                    {item}
                  </span>
                </StaggerItem>
              ))}
            </Stagger>
          </Card>

          <Card>
            <p className="mb-3 font-mono text-caption text-fg-muted">PageTransition</p>
            <ButtonGroup label="Demo page">
              <Button
                size="sm"
                variant={pageKey === 'overview' ? 'primary' : 'outline'}
                onClick={() => setPageKey('overview')}
              >
                Overview
              </Button>
              <Button
                size="sm"
                variant={pageKey === 'holdings' ? 'primary' : 'outline'}
                onClick={() => setPageKey('holdings')}
              >
                Holdings
              </Button>
            </ButtonGroup>
            <PageTransition routeKey={pageKey} className="mt-4">
              <div className="rounded-lg border border-border-subtle p-4" data-testid="demo-page">
                <p className="text-h6 text-fg">
                  {pageKey === 'overview' ? 'Overview' : 'Holdings'}
                </p>
                <p className="mt-1 text-body-small text-fg-subtle">
                  The old page leaves before the new one arrives, so they never overlap.
                </p>
              </div>
            </PageTransition>
          </Card>

          <Card>
            <p className="mb-3 font-mono text-caption text-fg-muted">cardHover</p>
            <motion.div
              {...(reduced ? {} : cardHover)}
              className="cursor-pointer rounded-xl border border-border bg-surface-elevated p-4 shadow-card"
            >
              <p className="text-h6 text-fg">Hover me</p>
              <p className="mt-1 text-body-small text-fg-subtle">Lifts 2px — no more.</p>
            </motion.div>
          </Card>
        </div>

        <p className="text-caption text-fg-muted">
          Modals, drawers, menus, tooltips, tab indicators, the success tick and the offline banner
          all use these same presets. In Arabic, the start and end slides swap sides.
        </p>
      </div>
    </ShowcaseSection>
  );
}
