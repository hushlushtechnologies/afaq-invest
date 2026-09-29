'use client';

import { useTranslations } from 'next-intl';
import type { ReactNode } from 'react';
import type { CompanyStatus, CompanyType, CompanyVerification } from '@afaq/types';
import { Badge, StatusBadge, type StatusKind } from '@afaq/ui';

/**
 * What a company's status looks like.
 *
 * INACTIVE is "cancelled" — neutral grey — because a company that has simply
 * stopped trading is not a problem. SUSPENDED is red: somebody took a decision,
 * and it is worth noticing on a list of forty.
 */
const STATUS_TONES: Record<CompanyStatus, StatusKind> = {
  ACTIVE: 'active',
  INACTIVE: 'cancelled',
  SUSPENDED: 'suspended',
};

export function CompanyStatusBadge({ status }: { status: CompanyStatus }): ReactNode {
  const t = useTranslations('companies.status');
  return <StatusBadge status={STATUS_TONES[status]} label={t(status)} />;
}

/**
 * Whether the company is Afaq's own or an outside partner.
 *
 * Afaq's own get the brand tint; partners get an outline. The difference is
 * deliberately quiet — it is a fact about the company, not a warning — but it
 * is the first thing somebody scanning the list wants to know.
 */
export function CompanyTypeBadge({ type }: { type: CompanyType }): ReactNode {
  const t = useTranslations('companies.type');

  return (
    <Badge size="sm" variant={type === 'INTERNAL' ? 'primary' : 'outline'}>
      {t(type)}
    </Badge>
  );
}

/**
 * How far an outside company has got through vetting.
 *
 * NOT_REQUIRED renders nothing at all. Afaq's own companies are not
 * "unverified" — the question does not apply to them — and a grey "not
 * required" badge on every internal row would be nine rows of noise.
 */
const VERIFICATION_TONES: Record<Exclude<CompanyVerification, 'NOT_REQUIRED'>, StatusKind> = {
  PENDING: 'pending',
  UNDER_REVIEW: 'under-review',
  VERIFIED: 'approved',
  REJECTED: 'rejected',
};

export function CompanyVerificationBadge({
  verification,
}: {
  verification: CompanyVerification;
}): ReactNode {
  const t = useTranslations('companies.verification');

  if (verification === 'NOT_REQUIRED') return null;

  return <StatusBadge status={VERIFICATION_TONES[verification]} label={t(verification)} />;
}
