'use client';

import { ApiRequestError } from '@afaq/api-client';
import { CalendarClock, Star } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import type { ReactNode } from 'react';
import {
  isFinished,
  remainingCapacity,
  type InvestmentSettings,
  type Locale,
  type OpportunityDetail as Opportunity,
  type OpportunityStatus,
  type OpportunityTerms,
} from '@afaq/types';
import {
  Breadcrumb,
  Button,
  Card,
  CardBody,
  CardHeader,
  ErrorState,
  InfoCard,
  LoadingState,
} from '@afaq/ui';
import { formatCurrency, formatDateTime } from '@afaq/utils';
import { PermissionGate } from '@/components/auth/permission-gate';
import { CompanyTypeBadge } from '@/components/companies/company-badges';
import { LadderView } from '@/components/investment-rules/ladder-view';
import { Link } from '@/i18n/navigation';
import {
  useActiveRuleSet,
  useInvestmentSettings,
  useRuleSet,
} from '@/lib/investment-rules/use-investment-rules';
import { useOpportunity } from '@/lib/opportunities/use-opportunities';
import { OpportunityActions } from './opportunity-actions';
import { ClosingLabel, FundingProgress, OpportunityStatusBadge } from './opportunity-badges';

/**
 * One raise's page, behind its permission.
 *
 * Fetched in the browser rather than rendered on the server, for the same
 * reason as the rule-set page: the actions in the header change the raise,
 * and should refresh what is on screen without a full navigation.
 */
export function OpportunityDetail({ id }: { id: string | undefined }): ReactNode {
  return (
    <PermissionGate permission="opportunity.view">
      <OpportunityDetailBody id={id} />
    </PermissionGate>
  );
}

function OpportunityDetailBody({ id }: { id: string | undefined }): ReactNode {
  const t = useTranslations('opportunities');
  const tDetail = useTranslations('opportunities.detail');

  const { data: opportunity, isPending, isError, error, refetch } = useOpportunity(id);
  const { data: settings, isPending: settingsPending } = useInvestmentSettings();

  const hasId = typeof id === 'string' && id.trim().length > 0;

  // With no id the query never runs, so isPending would stay true for ever.
  if (hasId && (isPending || settingsPending)) return <LoadingState />;

  if (!hasId || isError || !opportunity || !settings) {
    // A wrong address is different from a broken request: retrying will not
    // fix the first, so it is not offered.
    const missing = !hasId || (error instanceof ApiRequestError && error.statusCode === 404);

    return (
      <ErrorState
        title={missing ? tDetail('missing.title') : tDetail('loadError.title')}
        description={missing ? tDetail('missing.description') : tDetail('loadError.description')}
        onRetry={missing ? undefined : () => void refetch()}
        actions={
          <Button variant="outline" asChild>
            <Link href="/investments/opportunities">{tDetail('backToList')}</Link>
          </Button>
        }
      />
    );
  }

  return (
    <div className="space-y-4">
      <Breadcrumb
        linkComponent={Link}
        items={[
          { label: t('title'), href: '/investments/opportunities' },
          { label: opportunity.title },
        ]}
      />

      <OpportunityHeader opportunity={opportunity} currency={settings.currency} />

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <Card>
          <CardHeader title={tDetail('about')} />
          <CardBody>
            {opportunity.description ? (
              <p className="text-body whitespace-pre-line text-fg-secondary">
                {opportunity.description}
              </p>
            ) : (
              <p className="text-body-small text-fg-muted">{tDetail('noDescription')}</p>
            )}
          </CardBody>
        </Card>

        <FundingCard opportunity={opportunity} currency={settings.currency} />
      </div>

      <TermsSection opportunity={opportunity} settings={settings} />
    </div>
  );
}

function OpportunityHeader({
  opportunity,
  currency,
}: {
  opportunity: Opportunity;
  currency: string;
}): ReactNode {
  const t = useTranslations('opportunities.detail');
  const tFeatured = useTranslations('opportunities');
  const locale = useLocale() as Locale;

  return (
    <Card>
      <CardBody className="space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0 space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-heading-4 text-fg">{opportunity.title}</h1>
              {opportunity.isFeatured ? (
                <>
                  <Star aria-hidden="true" className="size-4 shrink-0 fill-warning text-warning" />
                  <span className="sr-only">{tFeatured('featured')}</span>
                </>
              ) : null}
            </div>

            {opportunity.summary ? (
              <p className="text-body-small text-fg-secondary">{opportunity.summary}</p>
            ) : null}

            <div className="flex flex-wrap items-center gap-2">
              <OpportunityStatusBadge status={opportunity.status} />
              <Link
                href={`/companies/${opportunity.companySlug}`}
                className="rounded-sm text-body-small font-medium text-fg-secondary underline-offset-4 hover:text-accent hover:underline focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
              >
                {opportunity.companyName}
              </Link>
              <CompanyTypeBadge type={opportunity.companyType} />
            </div>

            {/* Who did what, and when. The opening is the one that matters: it
              is the moment the terms were fixed for every investor after. */}
            <p className="text-caption text-fg-muted">
              {t('createdBy', {
                who: opportunity.createdByName ?? t('someone'),
                when: formatDateTime(opportunity.createdAt, { locale }),
              })}
              {opportunity.opensAt ? (
                <>
                  {' · '}
                  {t('openedBy', {
                    who: opportunity.openedByName ?? t('someone'),
                    when: formatDateTime(opportunity.opensAt, { locale }),
                  })}
                </>
              ) : null}
              {opportunity.closedAt ? (
                <>
                  {' · '}
                  {t('endedAt', { when: formatDateTime(opportunity.closedAt, { locale }) })}
                </>
              ) : null}
            </p>
          </div>

          <OpportunityActions opportunity={opportunity} currency={currency} />
        </div>

        <StatusNote status={opportunity.status} />
      </CardBody>
    </Card>
  );
}

/**
 * What the current status means, in a sentence.
 *
 * Said on the page rather than left for somebody to infer from a badge — a
 * suspended raise in particular looks fine at a glance and is not.
 */
function StatusNote({ status }: { status: OpportunityStatus }): ReactNode {
  const t = useTranslations('opportunities.detail.statusNote');

  switch (status) {
    case 'DRAFT':
      return <InfoCard tone="neutral">{t('DRAFT')}</InfoCard>;
    case 'OPEN':
      return <InfoCard tone="success">{t('OPEN')}</InfoCard>;
    case 'SUSPENDED':
      return <InfoCard tone="warning">{t('SUSPENDED')}</InfoCard>;
    case 'FULLY_FUNDED':
      return <InfoCard tone="info">{t('FULLY_FUNDED')}</InfoCard>;
    case 'CLOSED':
      return <InfoCard tone="neutral">{t('CLOSED')}</InfoCard>;
    case 'CANCELLED':
      return <InfoCard tone="neutral">{t('CANCELLED')}</InfoCard>;
    default: {
      // Every status is handled above; this keeps it that way when one is added.
      const unhandled: never = status;
      return unhandled;
    }
  }
}

function FundingCard({
  opportunity,
  currency,
}: {
  opportunity: Opportunity;
  currency: string;
}): ReactNode {
  const t = useTranslations('opportunities.detail');
  const locale = useLocale() as Locale;

  const money = (amount: number): string =>
    formatCurrency(amount, { locale, currency, whole: true });

  const remaining = remainingCapacity(opportunity);
  const running = !isFinished(opportunity.status) && opportunity.status !== 'DRAFT';

  return (
    <Card>
      <CardHeader title={t('funding')} />
      <CardBody className="space-y-5">
        <FundingProgress
          committed={opportunity.committedAmount}
          target={opportunity.targetAmount}
          percent={opportunity.fundingPercent}
          currency={currency}
        />

        <dl className="grid gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-1">
            <dt className="text-caption text-fg-muted">{t('target')}</dt>
            <dd className="text-body text-numeric text-fg">{money(opportunity.targetAmount)}</dd>
          </div>
          <div className="flex flex-col gap-1">
            <dt className="text-caption text-fg-muted">{t('remaining')}</dt>
            <dd className="text-body text-numeric text-fg">
              {isFinished(opportunity.status) ? '—' : money(remaining)}
            </dd>
          </div>
          <div className="flex flex-col gap-1 sm:col-span-2">
            <dt className="flex items-center gap-1.5 text-caption text-fg-muted">
              <CalendarClock aria-hidden="true" className="size-3.5" />
              {t('closes')}
            </dt>
            <dd className="text-body">
              <ClosingLabel status={opportunity.status} closesAt={opportunity.closesAt} />
            </dd>
          </div>
        </dl>

        {/* The raise is a hard cap, so the reader should know that reaching
            the target ends it, rather than finding out when it does. */}
        {running ? <p className="text-caption text-fg-muted">{t('hardCapNote')}</p> : null}
      </CardBody>
    </Card>
  );
}

/**
 * The terms an investor gets.
 *
 * An opened raise shows the ladder it was pinned to — that exact version,
 * fetched by id, so a later publish cannot make this page lie about what
 * existing investors were sold. A draft has no terms yet; it shows the ladder
 * that *would* be pinned if it were opened right now, clearly marked as a
 * preview, or a warning that there is nothing to pin.
 */
function TermsSection({
  opportunity,
  settings,
}: {
  opportunity: Opportunity;
  settings: InvestmentSettings;
}): ReactNode {
  if (opportunity.terms) {
    return <PinnedTerms terms={opportunity.terms} settings={settings} />;
  }

  // Only a draft has no terms, but a finished raise that never opened — a
  // cancelled draft — has none either, and previewing today's ladder for it
  // would suggest it could still be opened.
  if (opportunity.status !== 'DRAFT') return <NoTermsRecorded />;

  return <PreviewTerms companyId={opportunity.companyId} settings={settings} />;
}

function PinnedTerms({
  terms,
  settings,
}: {
  terms: OpportunityTerms;
  settings: InvestmentSettings;
}): ReactNode {
  const t = useTranslations('opportunities.terms');
  const locale = useLocale() as Locale;
  const { data: ruleSet, isPending, isError, error } = useRuleSet(terms.ruleSetId);

  // Reading a ladder needs its own permission. Somebody who may see raises
  // but not the rules still gets the headline terms — they travel with the
  // raise — just not the full table.
  const notAllowed = error instanceof ApiRequestError && error.statusCode === 403;

  return (
    <Card>
      <CardHeader
        title={t('title')}
        description={t('pinnedTo', { name: terms.ruleSetName, version: terms.ruleSetVersion })}
        action={
          ruleSet ? (
            <Button variant="outline" size="sm" asChild>
              <Link href={`/investments/rules/${ruleSet.id}`}>{t('viewRuleSet')}</Link>
            </Button>
          ) : null
        }
      />
      <CardBody className="space-y-4">
        <dl className="grid gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-1">
            <dt className="text-caption text-fg-muted">{t('minimum')}</dt>
            <dd className="text-body text-numeric text-fg">
              {formatCurrency(terms.minimumInvestment, {
                locale,
                currency: settings.currency,
                whole: true,
              })}
            </dd>
          </div>
          <div className="flex flex-col gap-1">
            <dt className="text-caption text-fg-muted">{t('bestRate')}</dt>
            <dd className="text-body text-numeric text-fg">
              {t('bestRateValue', {
                percent: terms.bestRoiPercent,
                basis: terms.roiBasis,
                mode: terms.bestRoiMode,
              })}
            </dd>
          </div>
        </dl>

        {isPending ? (
          <LoadingState />
        ) : notAllowed ? (
          <InfoCard tone="neutral">{t('noRulePermission')}</InfoCard>
        ) : isError || !ruleSet ? (
          <InfoCard tone="danger">{t('loadError')}</InfoCard>
        ) : (
          <LadderView ruleSet={ruleSet} settings={settings} />
        )}
      </CardBody>
    </Card>
  );
}

function PreviewTerms({
  companyId,
  settings,
}: {
  companyId: string;
  settings: InvestmentSettings;
}): ReactNode {
  const t = useTranslations('opportunities.terms');
  const { data: ruleSet, isPending, isError, error } = useActiveRuleSet(companyId);

  // A 409 or 404 from "the active ladder" means nothing is published — a real
  // state of the platform, not a failure to load.
  const nothingLive =
    error instanceof ApiRequestError && (error.statusCode === 409 || error.statusCode === 404);
  const notAllowed = error instanceof ApiRequestError && error.statusCode === 403;

  return (
    <Card>
      <CardHeader title={t('title')} description={t('previewDescription')} />
      <CardBody className="space-y-4">
        {isPending ? (
          <LoadingState />
        ) : nothingLive ? (
          <InfoCard tone="warning">{t('noLiveLadder')}</InfoCard>
        ) : notAllowed ? (
          <InfoCard tone="neutral">{t('noRulePermission')}</InfoCard>
        ) : isError || !ruleSet ? (
          <InfoCard tone="danger">{t('loadError')}</InfoCard>
        ) : (
          <>
            <InfoCard tone="info">
              {t('previewNote', { name: ruleSet.name, version: ruleSet.version })}
            </InfoCard>
            <LadderView ruleSet={ruleSet} settings={settings} />
          </>
        )}
      </CardBody>
    </Card>
  );
}

function NoTermsRecorded(): ReactNode {
  const t = useTranslations('opportunities.terms');

  return (
    <Card>
      <CardHeader title={t('title')} />
      <CardBody>
        <p className="text-body-small text-fg-muted">{t('neverOpened')}</p>
      </CardBody>
    </Card>
  );
}
