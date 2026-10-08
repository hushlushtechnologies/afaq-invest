'use client';

import { ApiRequestError } from '@afaq/api-client';
import { Calculator } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import { useState, type ReactNode } from 'react';
import { INVESTMENT_MODES, intlLocaleOf, type InvestmentMode, type Locale } from '@afaq/types';
import {
  Button,
  ButtonGroup,
  Card,
  CardBody,
  CardHeader,
  CurrencyInput,
  FormDescription,
  FormField,
  FormLabel,
  InfoCard,
  Input,
  Metric,
  Select,
  Skeleton,
} from '@afaq/ui';
import { formatCurrency } from '@afaq/utils';
import { useCompanyList } from '@/lib/companies/use-companies';
import { useInvestmentQuote, type ResolveQuery } from '@/lib/investment-rules/use-investment-rules';
import { useDebouncedValue } from '@/lib/use-debounced-value';
import { InvestmentModeBadge, RateLabel } from './rule-set-badges';

/**
 * What an amount would earn.
 *
 * Every figure comes from the API's /quote endpoint. Nothing is worked out
 * here — not the tier, not the rate, not the money. That is deliberate and
 * it is the whole architecture in one component: if this screen did its own
 * arithmetic there would be two answers to what the business owes somebody,
 * and the wrong one would be the one the investor saw.
 *
 * Which means this is also the honest way to test the rules. Type an amount,
 * see what the platform actually says.
 */
export function TierCalculator({
  currency,
  minimumInvestment,
}: {
  currency: string;
  minimumInvestment: number;
}): ReactNode {
  const t = useTranslations('investmentRules.calculator');
  const tMode = useTranslations('investmentRules.mode');
  const tPayout = useTranslations('investmentRules.payout');
  const locale = useLocale() as Locale;

  // Starts at the platform minimum: a sensible first answer beats an empty
  // panel, and it shows immediately what the smallest investment earns.
  const [amount, setAmount] = useState<number | null>(minimumInvestment);
  const [mode, setMode] = useState<InvestmentMode>('LOCKED');
  const [termMonths, setTermMonths] = useState<number | null>(12);
  const [companyId, setCompanyId] = useState('');

  const { data: companies } = useCompanyList({ status: 'ACTIVE', pageSize: 100 });

  // Debounced, so typing an amount is one request rather than one per digit.
  const settledAmount = useDebouncedValue(amount);

  const query: ResolveQuery | null =
    settledAmount !== null && settledAmount > 0
      ? {
          amount: settledAmount,
          mode,
          ...(companyId ? { companyId } : {}),
          ...(termMonths !== null ? { termMonths } : {}),
        }
      : null;

  const { data: quote, isFetching, isError, error } = useInvestmentQuote(query);

  const money = (value: number): string => formatCurrency(value, { locale, currency });

  /**
   * The API's own refusal, in its own words.
   *
   * "The smallest investment is AED 25,000", "Tier 3 does not currently offer
   * an unlocked option", "The shortest term for this tier is 12 months" — each
   * of those tells somebody what to change. They are also exactly the messages
   * an investor would hit, which is the point of showing them here.
   */
  const refusal = isError ? (error instanceof ApiRequestError ? error.message : t('failed')) : null;

  return (
    <Card>
      <CardHeader title={t('title')} description={t('description')} />

      <CardBody className="space-y-5">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <FormField>
            <FormLabel>{t('amount')}</FormLabel>
            <CurrencyInput
              value={amount}
              onValueChange={setAmount}
              currency={currency}
              locale={intlLocaleOf(locale)}
              decimals={0}
            />
            <FormDescription>{t('minimum', { amount: money(minimumInvestment) })}</FormDescription>
          </FormField>

          <FormField>
            <FormLabel>{t('mode')}</FormLabel>
            <ButtonGroup label={t('mode')}>
              {INVESTMENT_MODES.map((value) => (
                <Button
                  key={value}
                  size="sm"
                  // The chosen one is filled; the other is an outline. A
                  // segmented control where both look the same is a control
                  // nobody can read.
                  variant={mode === value ? 'primary' : 'outline'}
                  aria-pressed={mode === value}
                  onClick={() => {
                    setMode(value);
                    // An unlocked investment has no term, so carrying one over
                    // would ask the API to price something it does not offer.
                    setTermMonths(value === 'LOCKED' ? 12 : null);
                  }}
                >
                  {tMode(value)}
                </Button>
              ))}
            </ButtonGroup>
          </FormField>

          {/* Only for locked money. An unlocked option is open-ended, and a
              term box beside it would imply a commitment that is not there. */}
          {mode === 'LOCKED' ? (
            <FormField>
              <FormLabel>{t('term')}</FormLabel>
              <Input
                type="number"
                inputMode="numeric"
                min={1}
                max={120}
                value={termMonths === null ? '' : String(termMonths)}
                onChange={(event) =>
                  setTermMonths(event.target.value === '' ? null : Number(event.target.value))
                }
                suffix={t('months')}
              />
              <FormDescription>{t('termHelp')}</FormDescription>
            </FormField>
          ) : null}

          <FormField>
            <FormLabel>{t('company')}</FormLabel>
            <Select
              value={companyId}
              onChange={(event) => setCompanyId(event.target.value)}
              options={[
                { value: '', label: t('platformWide') },
                ...(companies?.items ?? []).map((company) => ({
                  value: company.id,
                  label: company.name,
                })),
              ]}
            />
            <FormDescription>{t('companyHelp')}</FormDescription>
          </FormField>
        </div>

        {/* --- the answer ---------------------------------------------- */}
        {refusal ? (
          <InfoCard tone="warning" announce>
            {refusal}
          </InfoCard>
        ) : quote ? (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-3">
              <span className="text-label text-fg-secondary">{quote.terms.tierName}</span>
              <InvestmentModeBadge mode={quote.terms.mode} />
              <RateLabel percent={quote.terms.roiPercent} basis={quote.terms.roiBasis} />
              <span className="text-caption text-fg-muted">
                {t('yearlyRate', { percent: quote.terms.annualisedRoiPercent })}
              </span>
              <span className="text-caption text-fg-muted">
                {t('paid', { frequency: tPayout(quote.terms.payoutFrequency) })}
              </span>
            </div>

            <div
              // Dimmed while a newer answer is on its way, rather than cleared.
              // Blanking the figures makes the panel flicker on every keystroke
              // and invites somebody to read a half-updated number.
              className={`grid gap-4 sm:grid-cols-3 ${isFetching ? 'opacity-60' : ''}`}
              aria-busy={isFetching}
            >
              <Metric
                label={
                  quote.payoutsPerYear === null
                    ? t('atMaturity')
                    : t('perPayout', { frequency: tPayout(quote.terms.payoutFrequency) })
                }
                value={quote.returnPerPayout === null ? '—' : money(quote.returnPerPayout)}
              />

              <Metric label={t('perYear')} value={money(quote.returnPerYear)} />

              <Metric
                label={
                  quote.termMonths === null
                    ? t('overTermOpen')
                    : t('overTerm', { months: quote.termMonths })
                }
                value={quote.totalReturnOverTerm === null ? '—' : money(quote.totalReturnOverTerm)}
              />
            </div>

            {/* Said once, here, because the three figures above are each
                rounded on their own and twelve monthly payments therefore
                need not add up to the yearly figure exactly. Better to
                explain a one-fils difference than to have somebody find it
                and distrust the whole panel. */}
            <p className="text-caption text-fg-muted">{t('roundingNote')}</p>

            <p className="text-caption text-fg-muted">
              {t('fromVersion', {
                name: quote.terms.ruleSetName,
                version: quote.terms.ruleSetVersion,
              })}
            </p>
          </div>
        ) : isFetching ? (
          <div className="grid gap-4 sm:grid-cols-3">
            {[0, 1, 2].map((slot) => (
              <div key={slot} className="space-y-2">
                <Skeleton className="h-3 w-24" />
                <Skeleton className="h-7 w-32" />
              </div>
            ))}
          </div>
        ) : (
          <InfoCard tone="neutral">
            <span className="flex items-center gap-2">
              <Calculator aria-hidden="true" className="size-4" />
              {t('enterAmount')}
            </span>
          </InfoCard>
        )}
      </CardBody>
    </Card>
  );
}
