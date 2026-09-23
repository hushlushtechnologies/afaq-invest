import { Building2, TrendingUp, Users, Wallet } from 'lucide-react';
import type { ReactNode } from 'react';
import {
  Avatar,
  Badge,
  Button,
  Card,
  CardBody,
  CardFooter,
  CardHeader,
  Divider,
  InfoCard,
  Metric,
  Progress,
  StatCard,
  StatusBadge,
  type BadgeVariant,
  type StatusKind,
} from '@afaq/ui';
import { formatCurrency } from '@afaq/utils';
import { ShowcaseSection } from './showcase-section';

const BADGE_VARIANTS: BadgeVariant[] = [
  'neutral',
  'primary',
  'accent',
  'success',
  'warning',
  'danger',
  'info',
  'outline',
];

const STATUSES: StatusKind[] = [
  'draft',
  'pending',
  'under-review',
  'approved',
  'active',
  'rejected',
  'expired',
  'suspended',
  'completed',
  'cancelled',
];

export function DisplayShowcase(): ReactNode {
  return (
    <>
      <ShowcaseSection title="Stat cards">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard
            label="Assets under management"
            value={formatCurrency(48250000)}
            icon={<Wallet />}
            trend={{ value: 12.4, label: 'vs last quarter' }}
            footer="Across 9 internal companies"
          />
          <StatCard
            label="Active investors"
            value="1,284"
            icon={<Users />}
            trend={{ value: 5.2, label: 'vs last month' }}
          />
          <StatCard
            label="Open opportunities"
            value="17"
            icon={<Building2 />}
            trend={{ value: -3.1, label: 'vs last month' }}
          />
          <StatCard
            label="Default rate"
            value="1.8"
            unit="%"
            icon={<TrendingUp />}
            trend={{ value: 0.4, label: 'vs last quarter', positiveIsGood: false }}
            variant="highlight"
          />
        </div>
        <p className="mt-3 text-caption text-fg-muted">
          The default rate rose, yet shows red: a rising default rate is bad news.
        </p>
      </ShowcaseSection>

      <ShowcaseSection title="Card variants">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          <Card variant="flat">
            <CardHeader title="Flat" description="Grouping and low emphasis" />
          </Card>
          <Card variant="outline">
            <CardHeader title="Outline" description="The default for most content" />
          </Card>
          <Card variant="elevated">
            <CardHeader title="Elevated" description="Content that genuinely floats" />
          </Card>
          <Card variant="highlight">
            <CardHeader eyebrow="Featured" title="Highlight" description="One per screen" />
          </Card>
        </div>
      </ShowcaseSection>

      <ShowcaseSection title="Composed card">
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <Card interactive>
            <CardHeader
              eyebrow="Real Estate"
              title="Emerald Tower — Al Jaddaf"
              description="Afaq Al Manzil Properties"
              action={<StatusBadge status="active" />}
            />
            <CardBody>
              <Progress
                label="Funding progress"
                value={6800000}
                max={10000000}
                showValue
                valueText={`${formatCurrency(6800000)} of ${formatCurrency(10000000)}`}
                tone="gradient"
              />
              <div className="mt-5 grid grid-cols-3 gap-4">
                <Metric label="Target return" value="14.5" unit="%" size="sm" />
                <Metric label="Term" value="24" unit="months" size="sm" />
                <Metric label="Investors" value="86" size="sm" />
              </div>
            </CardBody>
            <CardFooter>
              <Button size="sm" variant="gradient">
                View details
              </Button>
              <Button size="sm" variant="ghost">
                Documents
              </Button>
              <Badge variant="primary" className="ms-auto">
                INTERNAL
              </Badge>
            </CardFooter>
          </Card>

          <div className="space-y-4">
            <InfoCard tone="info" title="KYC verification pending">
              Three investor applications are waiting for document review.
            </InfoCard>
            <InfoCard tone="warning" title="Distribution due">
              Q3 distributions must be approved before 30 September.
            </InfoCard>
            <InfoCard
              tone="danger"
              title="Payment failed"
              action={
                <Button size="sm" variant="outline">
                  Retry
                </Button>
              }
            >
              A scheduled transfer could not be processed.
            </InfoCard>
            <InfoCard tone="success">Reconciliation completed with no differences.</InfoCard>
          </div>
        </div>
      </ShowcaseSection>

      <ShowcaseSection title="Badges">
        <Card>
          <div className="flex flex-wrap gap-2">
            {BADGE_VARIANTS.map((variant) => (
              <Badge key={variant} variant={variant}>
                {variant}
              </Badge>
            ))}
          </div>
          <Divider className="my-5" />
          <div className="flex flex-wrap gap-2">
            {STATUSES.map((status) => (
              <StatusBadge key={status} status={status} />
            ))}
          </div>
          <Divider className="my-5" label="sizes" />
          <div className="flex flex-wrap items-center gap-2">
            <Badge size="sm" variant="primary">
              Small
            </Badge>
            <Badge size="md" variant="primary">
              Medium
            </Badge>
            <Badge size="sm" variant="success" dot>
              With dot
            </Badge>
          </div>
        </Card>
      </ShowcaseSection>

      <ShowcaseSection title="Avatars">
        <Card>
          <div className="flex flex-wrap items-end gap-4">
            {(['xs', 'sm', 'md', 'lg', 'xl'] as const).map((size) => (
              <Avatar key={size} name="Ahmed Al Mansouri" size={size} />
            ))}
          </div>
          <Divider className="my-5" label="tints and status" />
          <div className="flex flex-wrap items-center gap-4">
            <Avatar name="Ahmed Al Mansouri" status="online" />
            <Avatar name="Fatima Hassan" status="busy" />
            <Avatar name="Omar Khalid" status="offline" />
            <Avatar name="Layla Ibrahim" />
            <Avatar name="Broken Image" src="https://example.invalid/missing.png" />
          </div>
          <p className="mt-3 text-caption text-fg-muted">
            The last one has a broken photo address and falls back to initials.
          </p>
        </Card>
      </ShowcaseSection>

      <ShowcaseSection title="Progress">
        <Card className="space-y-5">
          <Progress label="Primary" value={72} showValue />
          <Progress label="Gradient" value={45} tone="gradient" showValue size="lg" />
          <Progress label="Success" value={100} tone="success" showValue />
          <Progress label="Warning" value={38} tone="warning" showValue />
          <Progress label="Danger" value={12} tone="danger" showValue size="sm" />
        </Card>
      </ShowcaseSection>
    </>
  );
}
