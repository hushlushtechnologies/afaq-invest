'use client';

import { useLocale, useTranslations } from 'next-intl';
import type { ReactNode } from 'react';
import { KeyRound, Percent, ShieldOff, Wallet } from 'lucide-react';
import { annualisedRoi, type Locale } from '@afaq/types';
import { Card, CardBody, CardHeader, InfoCard, Skeleton } from '@afaq/ui';
import { formatCurrency } from '@afaq/utils';
import { useInvestmentSettings } from '@/lib/investment-rules/use-investment-rules';

/** One labelled fact, with the icon that makes it findable at a glance. */
function Fact({
  icon,
  label,
  value,
  note,
}: {
  icon: ReactNode;
  label: string;
  value: string;
  note?: string;
}): ReactNode {
  return (
    <div className="flex items-start gap-3">
      <span aria-hidden="true" className="mt-0.5 text-fg-muted">
        {icon}
      </span>
      <span className="flex min-w-0 flex-col">
        <span className="text-caption text-fg-muted">{label}</span>
        <span className="text-body text-numeric text-fg">{value}</span>
        {note ? <span className="text-caption text-fg-muted">{note}</span> : null}
      </span>
    </div>
  );
}

/**
 * The platform settings every ladder is judged against.
 *
 * Read-only here, on purpose. These four values decide whether any ladder is
 * allowed to exist, so changing them sits behind its own screen rather than
 * being editable in passing from a list — and seeing them beside the ladders
 * is what makes a rejected draft make sense.
 */
export function InvestmentSettingsCard(): ReactNode {
  const t = useTranslations('investmentRules.settings');
  const tBasis = useTranslations('investmentRules.basis');
  const locale = useLocale() as Locale;

  const { data, isPending, isError } = useInvestmentSettings();

  if (isPending) {
    return (
      <Card>
        <CardBody className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {[0, 1, 2, 3].map((slot) => (
            <div key={slot} className="flex flex-col gap-1.5">
              <Skeleton className="h-3 w-20" />
              <Skeleton className="h-5 w-28" />
            </div>
          ))}
        </CardBody>
      </Card>
    );
  }

  if (isError || !data) {
    return <InfoCard tone="danger">{t('loadError')}</InfoCard>;
  }

  // Shown beside the cap so a monthly figure cannot be mistaken for a yearly
  // one. 10% a month and 10% a year differ by a factor of twelve, and this is
  // the one place somebody can check which the platform means.
  const capYearly = annualisedRoi(data.maxRoiPercent, data.maxRoiBasis);

  return (
    <Card>
      <CardHeader title={t('title')} description={t('description')} />
      <CardBody className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        <Fact
          icon={<Wallet className="size-4" />}
          label={t('minimum')}
          value={formatCurrency(data.minimumInvestment, {
            locale,
            currency: data.currency,
            whole: true,
          })}
          note={t('minimumNote')}
        />

        <Fact
          icon={<Percent className="size-4" />}
          label={t('cap')}
          value={`${data.maxRoiPercent}% ${tBasis(data.maxRoiBasis)}`}
          note={data.maxRoiBasis === 'ANNUAL' ? undefined : t('capYearly', { percent: capYearly })}
        />

        <Fact icon={<Wallet className="size-4" />} label={t('currency')} value={data.currency} />

        <Fact
          icon={
            data.requireStepUpToPublish ? (
              <KeyRound className="size-4" />
            ) : (
              <ShieldOff className="size-4 text-danger" />
            )
          }
          label={t('stepUp')}
          value={data.requireStepUpToPublish ? t('stepUpOn') : t('stepUpOff')}
          note={data.requireStepUpToPublish ? t('stepUpNote') : t('stepUpOffNote')}
        />
      </CardBody>
    </Card>
  );
}
