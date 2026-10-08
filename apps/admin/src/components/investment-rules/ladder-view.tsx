'use client';

import { useLocale, useTranslations } from 'next-intl';
import type { ReactNode } from 'react';
import {
  annualisedRoi,
  type InvestmentSettings,
  type Locale,
  type RuleSetDetail,
} from '@afaq/types';
import { Card, CardBody, EmptyState, InfoCard } from '@afaq/ui';
import { formatCurrency } from '@afaq/utils';
import { InvestmentModeBadge, RateLabel } from './rule-set-badges';

/**
 * A ladder, read-only.
 *
 * What a live or archived version shows, and what a draft shows before
 * anybody opens the editor. Tiers in order, each with its range and whatever
 * modes it offers.
 *
 * Every rate carries both the quoted figure and its yearly equivalent. The
 * quoted figure is what the business decided; the yearly one is what makes it
 * comparable with anything else, and printing only one of them is how a
 * monthly rate gets read as an annual one.
 */
export function LadderView({
  ruleSet,
  settings,
}: {
  ruleSet: RuleSetDetail;
  settings: InvestmentSettings;
}): ReactNode {
  const t = useTranslations('investmentRules.ladder');
  const tPayout = useTranslations('investmentRules.payout');
  const locale = useLocale() as Locale;

  if (ruleSet.tiers.length === 0) {
    return (
      <EmptyState
        title={t('empty.title')}
        description={
          ruleSet.status === 'DRAFT' ? t('empty.draftDescription') : t('empty.description')
        }
      />
    );
  }

  const money = (amount: number): string =>
    formatCurrency(amount, { locale, currency: settings.currency, whole: true });

  return (
    <div className="space-y-3">
      {ruleSet.tiers.map((tier) => (
        <Card key={tier.id}>
          <CardBody className="space-y-4">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h3 className="text-heading-6 text-fg">{tier.name}</h3>
              <p className="text-body-small text-numeric text-fg-secondary">
                {tier.maxAmount === null
                  ? t('fromUpwards', { from: money(tier.minAmount) })
                  : t('range', { from: money(tier.minAmount), to: money(tier.maxAmount) })}
              </p>
            </div>

            {tier.options.length === 0 ? (
              <InfoCard tone="warning">{t('noOptions')}</InfoCard>
            ) : (
              <div className="grid gap-3 md:grid-cols-2">
                {tier.options.map((option) => (
                  <div
                    key={option.id}
                    className="bg-surface-subtle space-y-2 rounded-lg border border-border p-3"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <InvestmentModeBadge mode={option.mode} />
                      {/* A disabled option is kept visible rather than hidden:
                          it is part of what this version says, and somebody
                          comparing two versions needs to see it was switched
                          off rather than never there. */}
                      {option.isEnabled ? null : (
                        <span className="text-caption text-fg-muted">{t('switchedOff')}</span>
                      )}
                    </div>

                    <div className="flex flex-wrap items-baseline gap-2">
                      <RateLabel percent={option.roiPercent} basis={ruleSet.roiBasis} />
                      <span className="text-caption text-fg-muted">
                        {t('yearly', {
                          percent: annualisedRoi(option.roiPercent, ruleSet.roiBasis),
                        })}
                      </span>
                    </div>

                    <dl className="grid grid-cols-2 gap-x-3 gap-y-1 text-caption">
                      <dt className="text-fg-muted">{t('payout')}</dt>
                      <dd className="text-fg-secondary">{tPayout(option.payoutFrequency)}</dd>

                      <dt className="text-fg-muted">{t('term')}</dt>
                      <dd className="text-fg-secondary">
                        {option.minTermMonths === null
                          ? t('openEnded')
                          : t('months', {
                              min: option.minTermMonths,
                              max: option.maxTermMonths ?? option.minTermMonths,
                            })}
                      </dd>

                      <dt className="text-fg-muted">{t('notice')}</dt>
                      <dd className="text-fg-secondary">
                        {option.noticePeriodDays > 0
                          ? t('noticeDays', { days: option.noticePeriodDays })
                          : t('noNotice')}
                      </dd>

                      {option.noticePeriodDays > 0 ? (
                        <>
                          <dt className="text-fg-muted">{t('duringNotice')}</dt>
                          <dd className="text-fg-secondary">
                            {option.earnsDuringNotice ? t('stillEarns') : t('earnsNothing')}
                          </dd>
                        </>
                      ) : null}
                    </dl>
                  </div>
                ))}
              </div>
            )}
          </CardBody>
        </Card>
      ))}
    </div>
  );
}
