'use client';

import { useTranslations } from 'next-intl';
import type { ReactNode } from 'react';
import type { InvestmentMode, RoiBasis, RuleSetScope, RuleSetStatus } from '@afaq/types';
import { Badge, StatusBadge, type StatusKind } from '@afaq/ui';

/**
 * What a rule set's state looks like.
 *
 * ACTIVE is green because it is the one investors are being sold right now —
 * the single most important thing to spot on a list. ARCHIVED is "expired"
 * grey rather than red: it is not a failure, it is history, and it is the
 * record of what somebody was sold.
 */
const STATUS_TONES: Record<RuleSetStatus, StatusKind> = {
  DRAFT: 'draft',
  ACTIVE: 'active',
  ARCHIVED: 'expired',
};

export function RuleSetStatusBadge({ status }: { status: RuleSetStatus }): ReactNode {
  const t = useTranslations('investmentRules.status');
  return <StatusBadge status={STATUS_TONES[status]} label={t(status)} />;
}

/**
 * Whether a ladder applies platform-wide or to one company.
 *
 * Platform-wide gets the brand tint; a company's own gets an outline and
 * carries the company's name, because "COMPANY" on its own tells nobody which.
 */
export function RuleSetScopeBadge({
  scope,
  companyName,
}: {
  scope: RuleSetScope;
  companyName?: string | null;
}): ReactNode {
  const t = useTranslations('investmentRules.scope');

  if (scope === 'GLOBAL') {
    return (
      <Badge size="sm" variant="primary">
        {t('GLOBAL')}
      </Badge>
    );
  }

  return (
    <Badge size="sm" variant="outline">
      {companyName ?? t('COMPANY')}
    </Badge>
  );
}

/** Locked or unlocked, in one word. */
export function InvestmentModeBadge({ mode }: { mode: InvestmentMode }): ReactNode {
  const t = useTranslations('investmentRules.mode');

  return (
    <Badge size="sm" variant={mode === 'LOCKED' ? 'info' : 'neutral'}>
      {t(mode)}
    </Badge>
  );
}

/**
 * A rate, with the period it is quoted over.
 *
 * Never shown as a bare "4%" anywhere in the product. A percentage without its
 * period is the one number in this system that can be read two ways, and the
 * two readings differ by a factor of twelve.
 */
export function RateLabel({ percent, basis }: { percent: number; basis: RoiBasis }): ReactNode {
  // A flat namespace keyed by the basis itself, so `t(basis)` is checked at
  // build time against the message files with no cast in sight.
  const t = useTranslations('investmentRules.basisSuffix');

  return (
    <span className="text-numeric whitespace-nowrap text-fg">
      {percent}% <span className="text-caption text-fg-muted">{t(basis)}</span>
    </span>
  );
}
