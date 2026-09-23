'use client';

import { ArrowLeft, LifeBuoy, Plus } from 'lucide-react';
import { useState, type ReactNode } from 'react';
import {
  Button,
  Card,
  CardHeader,
  EmptyState,
  ErrorState,
  LoadingOverlay,
  LoadingState,
  Metric,
  NoPermissionState,
  OfflineBanner,
  OfflineState,
  Skeleton,
  SkeletonCard,
  SkeletonStatCard,
  SkeletonText,
  SuccessState,
  Switch,
  useOnlineStatus,
} from '@afaq/ui';
import { ShowcaseSection } from './showcase-section';

function Frame({ label, children }: { label: string; children: ReactNode }): ReactNode {
  return (
    <div className="overflow-hidden rounded-xl border border-border bg-surface">
      <p className="border-b border-border-subtle bg-background-subtle px-4 py-2 font-mono text-caption text-fg-muted">
        {label}
      </p>
      {children}
    </div>
  );
}

export function StateShowcase(): ReactNode {
  const [refreshing, setRefreshing] = useState(false);
  const [loadingKey, setLoadingKey] = useState(0);
  const [successKey, setSuccessKey] = useState(0);
  const [retries, setRetries] = useState(0);
  const online = useOnlineStatus();

  return (
    <>
      <ShowcaseSection title="Loading">
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <Frame label="LoadingState — block (waits 200ms before showing)">
            <LoadingState key={loadingKey} label="Loading investors" />
            <div className="border-t border-border-subtle px-4 py-3">
              <Button size="sm" variant="outline" onClick={() => setLoadingKey((key) => key + 1)}>
                Restart
              </Button>
            </div>
          </Frame>
          <Frame label="LoadingOverlay — refreshing existing content">
            <div className="p-4">
              <LoadingOverlay active={refreshing} label="Updating figures">
                <Card variant="flat">
                  <CardHeader
                    title="Portfolio value"
                    description="Stays visible while it refreshes"
                  />
                  <Metric className="mt-4" label="Total" value="AED 48,250,000" />
                </Card>
              </LoadingOverlay>
              <Switch
                wrapperClassName="mt-4"
                label="Refreshing"
                checked={refreshing}
                onChange={(event) => setRefreshing(event.target.checked)}
              />
            </div>
          </Frame>
        </div>
        <p className="mt-3 text-caption text-fg-muted">
          Inline: <LoadingState variant="inline" label="Checking availability" delay={0} />
        </p>
      </ShowcaseSection>

      <ShowcaseSection title="Skeletons">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <SkeletonStatCard />
          <SkeletonStatCard />
          <SkeletonCard className="xl:col-span-2" />
        </div>
        <Card className="mt-4 space-y-4">
          <div className="flex items-center gap-3">
            <Skeleton shape="circle" width="3rem" />
            <div className="flex-1 space-y-2">
              <Skeleton shape="text" width="40%" height="0.875rem" />
              <Skeleton shape="text" width="25%" />
            </div>
          </div>
          <SkeletonText lines={4} />
        </Card>
        <p className="mt-3 text-caption text-fg-muted">
          Skeletons match the shape of what is loading, so nothing jumps when the real content
          arrives. The shimmer stops for people who prefer reduced motion.
        </p>
      </ShowcaseSection>

      <ShowcaseSection title="Empty and error">
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <Frame label="EmptyState — nothing exists yet">
            <EmptyState
              title="No opportunities yet"
              description="Create the first investment opportunity for investors to see."
              action={
                <Button variant="gradient" iconStart={<Plus />}>
                  New opportunity
                </Button>
              }
            />
          </Frame>
          <Frame label="EmptyState — a search found nothing">
            <EmptyState
              kind="no-results"
              title="No matching companies"
              description="Nothing matches “Emerald”. Try a different spelling."
            />
          </Frame>
          <Frame label="ErrorState — retry and technical details">
            <ErrorState
              description="The investor list could not be loaded. Try again in a moment."
              onRetry={() =>
                new Promise<void>((resolve) =>
                  setTimeout(() => {
                    setRetries((count) => count + 1);
                    resolve();
                  }, 900),
                )
              }
              actions={
                <Button variant="ghost" iconStart={<LifeBuoy />}>
                  Contact support
                </Button>
              }
              details={`GET /api/v1/investors → 503 Service Unavailable\nRequest ID: 7f3c9a21-demo\nRetries so far: ${retries}`}
            />
          </Frame>
          <Frame label="SuccessState — after a completed action">
            <SuccessState
              key={successKey}
              title="Investment submitted"
              description="AED 250,000 in Emerald Tower is now awaiting payment confirmation."
              actions={
                <>
                  <Button variant="outline" onClick={() => setSuccessKey((key) => key + 1)}>
                    Replay
                  </Button>
                  <Button>View investment</Button>
                </>
              }
            />
          </Frame>
        </div>
      </ShowcaseSection>

      <ShowcaseSection title="Access and connection">
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <Frame label="NoPermissionState">
            <NoPermissionState
              actions={
                <Button variant="outline" iconStart={<ArrowLeft className="rtl:rotate-180" />}>
                  Go back
                </Button>
              }
            />
          </Frame>
          <Frame label="OfflineState">
            <OfflineState />
          </Frame>
        </div>
        <p className="mt-3 text-caption text-fg-muted">
          Connection right now:{' '}
          <span className="font-medium text-fg" data-testid="online-status">
            {online ? 'online' : 'offline'}
          </span>
          . Turn your network off (DevTools → Network → Offline) and a banner slides up at the
          bottom of the screen.
        </p>
        <OfflineBanner />
      </ShowcaseSection>
    </>
  );
}
