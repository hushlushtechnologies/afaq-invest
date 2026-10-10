'use client';

import { CircleCheckBig, FilePen, Rocket, Wallet } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import type { ReactNode } from 'react';
import type { Locale } from '@afaq/types';
import { Card, CardBody, InfoCard, Skeleton, StatCard } from '@afaq/ui';
import { formatCompactCurrency, formatNumber } from '@afaq/utils';
import { PermissionGate } from '@/components/auth/permission-gate';
import { useInvestmentSettings } from '@/lib/investment-rules/use-investment-rules';
import { useOpportunitySummary } from '@/lib/opportunities/use-opportunities';
import { OpportunitiesTable } from './opportunities-table';

/** Used only until the settings load, and only for formatting. */
const FALLBACK_CURRENCY = 'AED';

/**
 * Investment opportunities, behind their permission.
 *
 * The counts first, then the list. The counts answer the question somebody
 * opening this page usually has — how much are we raising right now — before
 * they have to read a single row.
 */
export function OpportunitiesDirectory(): ReactNode {
  return (
    <PermissionGate permission="opportunity.view">
      <OpportunitiesBody />
    </PermissionGate>
  );
}

function OpportunitiesBody(): ReactNode {
  // The platform currency, fetched once here and handed down, so the cards,
  // the table and the form all format money the same way.
  const { data: settings } = useInvestmentSettings();
  const currency = settings?.currency ?? FALLBACK_CURRENCY;

  return (
    <div className="space-y-6">
      <SummaryCards currency={currency} />
      {/* Always rendered: the list does not depend on the counts, and hiding
          it behind their failure would make one broken request look like an
          empty platform. */}
      <OpportunitiesTable currency={currency} />
    </div>
  );
}

function SummaryCards({ currency }: { currency: string }): ReactNode {
  const t = useTranslations('opportunities.summary');
  const locale = useLocale() as Locale;
  const { data: summary, isPending, isError } = useOpportunitySummary();

  if (isPending) {
    return (
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[0, 1, 2, 3].map((slot) => (
          <Card key={slot}>
            <CardBody className="flex flex-col gap-2">
              <Skeleton className="h-3 w-24" />
              <Skeleton className="h-7 w-20" />
            </CardBody>
          </Card>
        ))}
      </div>
    );
  }

  if (isError || !summary) return <InfoCard tone="danger">{t('loadError')}</InfoCard>;

  const money = (amount: number): string => formatCompactCurrency(amount, { locale, currency });

  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <StatCard
        label={t('open')}
        value={formatNumber(summary.open, { locale })}
        icon={<Rocket />}
        footer={t('ofTotal', { total: summary.total })}
      />
      <StatCard
        label={t('committed')}
        value={money(summary.committedOpen)}
        icon={<Wallet />}
        // Across open raises only — said under the figure, because "committed"
        // on its own invites the reader to assume it means everything ever.
        footer={t('ofTarget', { target: money(summary.targetOpen) })}
      />
      <StatCard
        label={t('draft')}
        value={formatNumber(summary.draft, { locale })}
        icon={<FilePen />}
        footer={t('draftHelp')}
      />
      <StatCard
        label={t('fullyFunded')}
        value={formatNumber(summary.fullyFunded, { locale })}
        icon={<CircleCheckBig />}
        footer={t('fullyFundedHelp')}
      />
    </div>
  );
}
