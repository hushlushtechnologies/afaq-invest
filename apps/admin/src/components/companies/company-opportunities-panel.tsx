'use client';

import { useTranslations } from 'next-intl';
import { useState, type ReactNode } from 'react';
import { PieChart, Plus } from 'lucide-react';
import type { CompanyDetail } from '@afaq/types';
import { Button, Card, CardBody, CardHeader, EmptyState, InfoCard, Skeleton } from '@afaq/ui';
import { Can } from '@/components/auth/can';
import { CreateOpportunityDrawer } from '@/components/opportunities/create-opportunity-drawer';
import {
  ClosingLabel,
  FundingProgress,
  OpportunityStatusBadge,
} from '@/components/opportunities/opportunity-badges';
import { Link } from '@/i18n/navigation';
import { useInvestmentSettings } from '@/lib/investment-rules/use-investment-rules';
import { useOpportunityList } from '@/lib/opportunities/use-opportunities';

/** How many raises the panel lists before pointing at the full list. */
const PANEL_SIZE = 5;

/** Used only until the settings load, and only for formatting. */
const FALLBACK_CURRENCY = 'AED';

/**
 * This company's raises, newest activity first.
 *
 * A short list, not a second directory: five rows and a link to the full,
 * filterable list. Only shown to people who may see opportunities at all —
 * the company page is reachable with `company.view` alone, and asking the API
 * for raises on their behalf would only produce a refusal to explain.
 */
export function CompanyOpportunitiesPanel({ company }: { company: CompanyDetail }): ReactNode {
  return (
    <Can permission="opportunity.view">
      <PanelBody company={company} />
    </Can>
  );
}

function PanelBody({ company }: { company: CompanyDetail }): ReactNode {
  const t = useTranslations('companies.detail.opportunities');
  const [creating, setCreating] = useState(false);

  const { data: settings } = useInvestmentSettings();
  const currency = settings?.currency ?? FALLBACK_CURRENCY;

  const { data, isPending, isError } = useOpportunityList({
    companyId: company.id,
    pageSize: PANEL_SIZE,
    sortField: 'updatedAt',
    sortDirection: 'desc',
  });

  const total = data?.total ?? 0;

  return (
    <Card>
      <CardHeader
        title={t('title')}
        description={t('description')}
        action={
          <Can permission="opportunity.create">
            <Button
              variant="outline"
              size="sm"
              iconStart={<Plus />}
              onClick={() => setCreating(true)}
            >
              {t('create')}
            </Button>
          </Can>
        }
      />
      <CardBody className="space-y-3">
        {isPending ? (
          [0, 1].map((slot) => <Skeleton key={slot} className="h-14 w-full" />)
        ) : isError || !data ? (
          <InfoCard tone="danger">{t('loadError')}</InfoCard>
        ) : data.items.length === 0 ? (
          <EmptyState
            kind="no-data"
            size="sm"
            icon={<PieChart />}
            title={t('empty.title')}
            description={
              company.acceptsInvestment
                ? t('empty.description', { name: company.name })
                : t('empty.blocked', { name: company.name })
            }
          />
        ) : (
          <>
            {!company.acceptsInvestment ? (
              <InfoCard tone="warning">{t('blockedNote', { name: company.name })}</InfoCard>
            ) : null}

            <ul className="divide-y divide-border-subtle">
              {data.items.map((opportunity) => (
                <li
                  key={opportunity.id}
                  className="grid gap-3 py-3 first:pt-0 last:pb-0 sm:grid-cols-[minmax(0,1fr)_10rem_8rem] sm:items-center"
                >
                  <span className="flex min-w-0 flex-col items-start gap-1">
                    <Link
                      href={`/investments/opportunities/${opportunity.id}`}
                      className="max-w-full truncate rounded-sm font-medium text-fg underline-offset-4 hover:text-accent hover:underline focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                    >
                      {opportunity.title}
                    </Link>
                    <OpportunityStatusBadge status={opportunity.status} />
                  </span>
                  <FundingProgress
                    compact
                    committed={opportunity.committedAmount}
                    target={opportunity.targetAmount}
                    percent={opportunity.fundingPercent}
                    currency={currency}
                  />
                  <span className="text-body-small">
                    <ClosingLabel status={opportunity.status} closesAt={opportunity.closesAt} />
                  </span>
                </li>
              ))}
            </ul>

            {total > data.items.length ? (
              <p className="text-body-small text-fg-muted">
                {t('more', { count: total - data.items.length })}{' '}
                <Link
                  href="/investments/opportunities"
                  className="rounded-sm font-medium text-accent underline-offset-4 hover:underline focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                >
                  {t('viewAll')}
                </Link>
              </p>
            ) : null}
          </>
        )}
      </CardBody>

      <CreateOpportunityDrawer
        open={creating}
        onClose={() => setCreating(false)}
        currency={currency}
        companyId={company.id}
      />
    </Card>
  );
}
