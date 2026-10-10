'use client';

import { useLocale, useTranslations } from 'next-intl';
import type { ReactNode } from 'react';
import { daysRemaining, isFinished, type Locale, type OpportunityStatus } from '@afaq/types';
import { Progress, StatusBadge, type StatusKind } from '@afaq/ui';
import { formatCurrency, formatDate } from '@afaq/utils';

/**
 * What an opportunity's state looks like.
 *
 * OPEN is green because it is the one taking money — the thing somebody
 * scanning the list is looking for. SUSPENDED is red: investors can see it
 * and cannot enter it, which needs attention. FULLY_FUNDED gets the brand
 * tint, because it is a success. CLOSED is "expired" grey and CANCELLED its
 * own grey: both are history, and neither is a failure on the screen's part.
 */
const STATUS_TONES: Record<OpportunityStatus, StatusKind> = {
  DRAFT: 'draft',
  OPEN: 'active',
  SUSPENDED: 'suspended',
  FULLY_FUNDED: 'completed',
  CLOSED: 'expired',
  CANCELLED: 'cancelled',
};

export function OpportunityStatusBadge({ status }: { status: OpportunityStatus }): ReactNode {
  const t = useTranslations('opportunities.status');
  return <StatusBadge status={STATUS_TONES[status]} label={t(status)} />;
}

/**
 * How full a raise is, as a bar and in words.
 *
 * The words are not decoration: a bar alone says "about two-thirds", and the
 * question somebody actually has is how many dirhams are still to come. The
 * percentage is the API's, rounded once on the server, so the list and the
 * detail page can never disagree about it.
 */
export function FundingProgress({
  committed,
  target,
  percent,
  currency,
  compact = false,
}: {
  committed: number;
  target: number;
  percent: number;
  currency: string;
  compact?: boolean;
}): ReactNode {
  const t = useTranslations('opportunities.funding');
  const locale = useLocale() as Locale;

  const money = (amount: number): string =>
    formatCurrency(amount, { locale, currency, whole: true });

  return (
    <div className={compact ? 'flex min-w-36 flex-col gap-1' : 'flex flex-col gap-1.5'}>
      {/* The visible label only on the detail page: above every row of a
          table it would be the same word twenty-five times. The bar still
          announces its value either way, through valueText. */}
      <Progress
        value={percent}
        max={100}
        size={compact ? 'sm' : 'md'}
        tone={percent >= 100 ? 'success' : 'primary'}
        label={compact ? undefined : t('label')}
        showValue={!compact}
        valueText={t('percent', { percent })}
      />
      <span className="text-caption text-numeric text-fg-muted">
        {t('amounts', { committed: money(committed), target: money(target) })}
      </span>
    </div>
  );
}

/**
 * When a raise closes, said the way somebody would say it.
 *
 * A running raise counts down in days; a finished one says it has ended; one
 * with no date says so rather than showing a dash that could mean "unknown".
 * The date itself is read in UAE time — the platform calendar — so the 31st
 * is the 31st for everybody.
 */
export function ClosingLabel({
  status,
  closesAt,
}: {
  status: OpportunityStatus;
  closesAt: string | null;
}): ReactNode {
  const t = useTranslations('opportunities.closing');
  const locale = useLocale() as Locale;

  if (closesAt === null) {
    return <span className="text-fg-muted">{t('openEnded')}</span>;
  }

  const date = formatDate(closesAt, { locale });

  if (isFinished(status) || status === 'FULLY_FUNDED') {
    return <span className="text-fg-secondary">{date}</span>;
  }

  const days = daysRemaining({ closesAt }) ?? 0;

  return (
    <span className="flex flex-col">
      <span className="text-fg-secondary">{date}</span>
      <span
        className={days <= 7 ? 'text-caption text-warning-strong' : 'text-caption text-fg-muted'}
      >
        {days === 0 ? t('passed') : t('daysLeft', { count: days })}
      </span>
    </span>
  );
}
