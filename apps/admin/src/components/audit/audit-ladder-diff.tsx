'use client';

import { useLocale, useTranslations } from 'next-intl';
import type { ReactNode } from 'react';
import {
  annualisedRoi,
  INVESTMENT_MODES,
  PAYOUT_FREQUENCIES,
  readAuditLadder,
  readAuditRoiBasis,
  ROI_BASES,
  type AuditLadderOption,
  type AuditLadderTierWithOptions,
  type InvestmentMode,
  type Locale,
  type PayoutFrequency,
  type RoiBasis,
} from '@afaq/types';
import { Badge } from '@afaq/ui';
import { formatNumber } from '@afaq/utils';

/**
 * The tiers an audit entry recorded, read as a ladder.
 *
 * Publishing a rule set writes the whole ladder into the entry, because this
 * is the record somebody comes back to in two years to establish what an
 * investor was actually sold. Until this phase it arrived in the viewer as one
 * table row containing several hundred characters of JSON — present in the
 * record, and in practice unreadable.
 *
 * Nothing here trusts the payload. It was written by whichever build of the
 * API was deployed at the time, and the reader (`readAuditLadder`) returns
 * null rather than throwing when the shape is not what this build expects, so
 * the drawer can fall back to showing it plainly.
 */

/** Translating a stored value only when it is one this build knows. */
function useStoredLabels(): {
  mode: (value: string) => { text: string; known: boolean };
  payout: (value: string) => string;
  basis: (value: string | null) => { suffix: string | null; basis: RoiBasis | null };
} {
  const tMode = useTranslations('investmentRules.mode');
  const tPayout = useTranslations('investmentRules.payout');
  const tSuffix = useTranslations('investmentRules.basisSuffix');

  return {
    mode: (value) =>
      (INVESTMENT_MODES as readonly string[]).includes(value)
        ? { text: tMode(value as InvestmentMode), known: true }
        : { text: value, known: false },

    payout: (value) =>
      (PAYOUT_FREQUENCIES as readonly string[]).includes(value)
        ? tPayout(value as PayoutFrequency)
        : value,

    basis: (value) => {
      if (value === null || !(ROI_BASES as readonly string[]).includes(value)) {
        return { suffix: null, basis: null };
      }

      return { suffix: tSuffix(value as RoiBasis), basis: value as RoiBasis };
    },
  };
}

/** One option on one tier: locked or not, at what rate, paid how. */
function OptionRow({
  option,
  basis,
  suffix,
}: {
  option: AuditLadderOption;
  basis: RoiBasis | null;
  suffix: string | null;
}): ReactNode {
  const t = useTranslations('audit.detail');
  const labels = useStoredLabels();

  const mode = labels.mode(option.mode);
  const [minTerm, maxTerm] = option.term;

  const term =
    minTerm === null && maxTerm === null
      ? t('termNone')
      : maxTerm === null
        ? t('termOpen', { min: minTerm ?? 0 })
        : t('term', { min: minTerm ?? 0, max: maxTerm });

  return (
    <li className="flex flex-wrap items-center gap-x-3 gap-y-1 py-1.5">
      <Badge size="sm" variant={mode.known && option.mode === 'LOCKED' ? 'info' : 'neutral'}>
        {mode.text}
      </Badge>

      {/* The rate always carries its period, or says the period is missing.
          A bare percentage is the one number in this system that can be read
          two ways, and the two readings differ by a factor of twelve. */}
      <span className="text-numeric whitespace-nowrap text-fg">
        {option.roi}%{' '}
        <span className="text-caption text-fg-muted">{suffix ?? `(${t('periodUnknown')})`}</span>
      </span>

      {basis === null ? null : (
        <span className="text-caption whitespace-nowrap text-fg-subtle">
          {t('perYear', { percent: annualisedRoi(option.roi, basis) })}
        </span>
      )}

      <span className="text-caption text-fg-muted">{labels.payout(option.payout)}</span>
      <span className="text-caption text-fg-muted">{term}</span>
      <span className="text-caption text-fg-muted">
        {option.notice > 0 ? t('notice', { days: option.notice }) : t('noNotice')}
      </span>
    </li>
  );
}

/** One tier, with its range and the options recorded against it. */
function TierCard({
  tier,
  basis,
  suffix,
  muted,
}: {
  tier: AuditLadderTierWithOptions;
  basis: RoiBasis | null;
  suffix: string | null;
  muted: boolean;
}): ReactNode {
  const t = useTranslations('audit.detail');
  const locale = useLocale() as Locale;

  const amount = (value: number): string => formatNumber(value, { locale, decimals: 0 });

  // No currency symbol: the entry records the numbers, not which currency the
  // platform was set to at the time, and inventing one would be a lie in the
  // one record nobody should have to second-guess.
  const range =
    tier.max === null
      ? t('fromUpwards', { from: amount(tier.min) })
      : t('range', { from: amount(tier.min), to: amount(tier.max) });

  return (
    <li
      className={
        muted
          ? 'bg-surface-subtle rounded-lg border border-border-subtle p-3 opacity-70'
          : 'rounded-lg border border-border bg-surface p-3'
      }
    >
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <span className="text-body-small font-medium text-fg">{tier.name}</span>
        <span className="text-caption text-numeric text-fg-secondary">{range}</span>
      </div>

      {tier.options.length === 0 ? (
        <p className="mt-1 text-caption text-fg-muted">{t('noOptions')}</p>
      ) : (
        <ul className="mt-1 divide-y divide-border-subtle">
          {tier.options.map((option, index) => (
            <OptionRow
              // Mode would be the natural key, but an old entry could carry
              // two options with the same mode; the position is what actually
              // identifies a row in a recorded list.
              key={`${option.mode}-${index}`}
              option={option}
              basis={basis}
              suffix={suffix}
            />
          ))}
        </ul>
      )}
    </li>
  );
}

/**
 * The ladder sections of an entry, or nothing at all.
 *
 * Returns null when neither side carries tiers, which is almost every entry —
 * the drawer uses that to decide whether to show the section at all.
 */
export function AuditLadderDiff({ before, after }: { before: unknown; after: unknown }): ReactNode {
  const t = useTranslations('audit.detail');
  const labels = useStoredLabels();

  const recorded = readAuditLadder(after);
  const replaced = readAuditLadder(before);

  if (recorded === null && replaced === null) return null;

  // The basis is recorded on the same payload as the tiers it describes, so
  // each side is read on its own: an older `before` may not carry one while
  // the `after` beside it does.
  const afterBasis = labels.basis(readAuditRoiBasis(after));
  const beforeBasis = labels.basis(readAuditRoiBasis(before));

  return (
    <>
      {recorded === null ? null : (
        <section className="space-y-2">
          <h3 className="text-label font-medium text-fg">{t('ladder')}</h3>
          <p className="text-caption text-fg-muted">{t('ladderAsRecorded')}</p>

          <ul className="space-y-2">
            {recorded.map((tier, index) => (
              <TierCard
                key={`${tier.name}-${index}`}
                tier={tier}
                basis={afterBasis.basis}
                suffix={afterBasis.suffix}
                muted={false}
              />
            ))}
          </ul>
        </section>
      )}

      {/* No emitter records both sides today — publishing records what went
          live, and the ladder it replaced is named rather than copied. This
          branch is here so that an entry which does carry both reads
          correctly rather than losing half of itself. */}
      {replaced === null ? null : (
        <section className="space-y-2">
          <h3 className="text-label font-medium text-fg">{t('ladderReplaced')}</h3>

          <ul className="space-y-2">
            {replaced.map((tier, index) => (
              <TierCard
                key={`${tier.name}-${index}`}
                tier={tier}
                basis={beforeBasis.basis}
                suffix={beforeBasis.suffix}
                muted
              />
            ))}
          </ul>
        </section>
      )}
    </>
  );
}

/** Whether an entry carries a ladder, so the generic table can leave it out. */
export function hasRecordedLadder(payload: unknown): boolean {
  return readAuditLadder(payload) !== null;
}
