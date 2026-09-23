'use client';

import { RotateCcw } from 'lucide-react';
import { useState, type ReactNode } from 'react';
import {
  Badge,
  Button,
  Card,
  LOTTIE_REGISTRY,
  LottieAnimation,
  SuccessState,
  type LottieName,
} from '@afaq/ui';
import { ShowcaseSection } from './showcase-section';

const NAMES = Object.keys(LOTTIE_REGISTRY) as LottieName[];

// Deliberately not a valid animation — shows what happens when a file is corrupt.
const BROKEN_ANIMATION = { v: '5.7.4', layers: 'not-a-list' };

export function LottieShowcase(): ReactNode {
  const [replay, setReplay] = useState(0);
  const [completed, setCompleted] = useState(0);

  return (
    <ShowcaseSection title="Lottie">
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
          {NAMES.map((name) => (
            <Card key={name} className="flex flex-col items-center gap-3 text-center">
              <LottieAnimation key={`${name}-${replay}`} name={name} size="lg" />
              <div>
                <p className="font-mono text-caption text-fg">{name}</p>
                <Badge
                  size="sm"
                  className="mt-1.5"
                  variant={LOTTIE_REGISTRY[name].available ? 'primary' : 'neutral'}
                >
                  {LOTTIE_REGISTRY[name].available ? 'demo file' : 'icon until file arrives'}
                </Badge>
              </div>
            </Card>
          ))}
        </div>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <Card padding="none">
            <SuccessState
              key={replay}
              title="Payment confirmed"
              description="The Lottie tick replaces the default icon through the illustration slot."
              illustration={
                <LottieAnimation
                  name="success"
                  size="xl"
                  onComplete={() => setCompleted((count) => count + 1)}
                />
              }
              actions={
                <Button
                  variant="outline"
                  iconStart={<RotateCcw />}
                  onClick={() => setReplay((key) => key + 1)}
                >
                  Replay
                </Button>
              }
            />
          </Card>

          <Card className="space-y-4">
            <div className="flex items-center gap-4">
              <LottieAnimation name="pending" size="md" label="Awaiting payment confirmation" />
              <div>
                <p className="text-h6 text-fg">Awaiting confirmation</p>
                <p className="text-body-small text-fg-subtle">
                  Looping, with a label for screen readers.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-4" data-testid="broken">
              <LottieAnimation
                src={BROKEN_ANIMATION}
                size="md"
                fallback={<span className="text-h4">!</span>}
              />
              <div>
                <p className="text-h6 text-fg">Corrupt file</p>
                <p className="text-body-small text-fg-subtle">
                  Falls back instead of leaving a blank space.
                </p>
              </div>
            </div>
            <p className="text-caption text-fg-muted">
              Success animation finished{' '}
              <span className="text-numeric text-fg" data-testid="completed">
                {completed}
              </span>{' '}
              time(s). With reduced motion, the tick appears already drawn and nothing plays.
            </p>
          </Card>
        </div>
      </div>
    </ShowcaseSection>
  );
}
