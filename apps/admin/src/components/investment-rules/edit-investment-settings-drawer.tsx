'use client';

import { ApiRequestError } from '@afaq/api-client';
import { Save } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import { useMemo, useState, type ReactNode } from 'react';
import {
  annualisedRoi,
  intlLocaleOf,
  ROI_BASES,
  validateTierLadder,
  type InvestmentSettings,
  type LadderContext,
  type Locale,
  type RoiBasis,
} from '@afaq/types';
import {
  Button,
  CurrencyInput,
  Drawer,
  FormDescription,
  FormField,
  FormLabel,
  InfoCard,
  Input,
  PasswordInput,
  Select,
  Switch,
} from '@afaq/ui';
import { useActiveRuleSet } from '@/lib/investment-rules/use-investment-rules';
import { useUpdateInvestmentSettings } from '@/lib/investment-rules/use-investment-rule-mutations';

/**
 * Changing the values every ladder is judged against.
 *
 * Its own screen rather than inline editing on the list, because these four
 * numbers decide whether any ladder is allowed to exist at all — and two of
 * them can make the ladder that is live right now fail its own rules.
 *
 * Which is why this drawer checks. Before saving it runs the live ladder
 * through `validateTierLadder` against the *proposed* settings and says what
 * would break. The API will not retroactively unpublish anything — existing
 * investments keep the terms they were sold, and that is correct — so the
 * only place this can be caught is here, before the change is made.
 */
export function EditInvestmentSettingsDrawer({
  settings,
  open,
  onClose,
}: {
  settings: InvestmentSettings;
  open: boolean;
  onClose: () => void;
}): ReactNode {
  const t = useTranslations('investmentRules.editSettings');
  const tBasis = useTranslations('investmentRules.basis');
  const tIssues = useTranslations('investmentRules.issues');
  const tActions = useTranslations('actions');
  const locale = useLocale() as Locale;

  const update = useUpdateInvestmentSettings();

  // The platform-wide live ladder, so the impact check below has something to
  // check against. A failure here is not fatal: it only means the warning
  // cannot be shown, which the drawer says rather than silently omitting.
  const { data: liveLadder, isError: ladderUnavailable } = useActiveRuleSet();

  const [currency, setCurrency] = useState(settings.currency);
  const [minimum, setMinimum] = useState<number | null>(settings.minimumInvestment);
  const [cap, setCap] = useState<number | null>(settings.maxRoiPercent);
  const [capBasis, setCapBasis] = useState<RoiBasis>(settings.maxRoiBasis);
  const [notice, setNotice] = useState<number | null>(settings.defaultNoticePeriodDays);
  const [stepUp, setStepUp] = useState(settings.requireStepUpToPublish);
  const [password, setPassword] = useState('');

  /** On → off is the one transition that needs the password it removes. */
  const disablingStepUp = settings.requireStepUpToPublish && !stepUp;

  /**
   * What the proposed settings would do to the ladder that is live.
   *
   * Lowering the cap below a live tier's rate, or raising the minimum above
   * where the ladder starts, both leave a published ladder that no longer
   * passes its own validation. Nothing breaks immediately — the ladder keeps
   * pricing investments — but the next person to copy it for a new version
   * cannot publish without changing rates, and nobody told them why.
   */
  const impact = useMemo(() => {
    if (!liveLadder || minimum === null || cap === null) return [];

    const proposed: LadderContext = {
      roiBasis: liveLadder.roiBasis,
      minimumInvestment: minimum,
      maxRoiPercent: cap,
      maxRoiBasis: capBasis,
    };

    return validateTierLadder(
      liveLadder.tiers.map((tier) => ({
        name: tier.name,
        minAmount: tier.minAmount,
        maxAmount: tier.maxAmount,
        options: tier.options.map((option) => ({
          mode: option.mode,
          roiPercent: option.roiPercent,
          payoutFrequency: option.payoutFrequency,
          minTermMonths: option.minTermMonths,
          maxTermMonths: option.maxTermMonths,
          noticePeriodDays: option.noticePeriodDays,
          earnsDuringNotice: option.earnsDuringNotice,
        })),
      })),
      proposed,
    );
  }, [liveLadder, minimum, cap, capBasis]);

  async function submit(): Promise<void> {
    await update.mutateAsync({
      // Only what actually changed, so the API's "nothing to change" refusal
      // and its audit entry both stay truthful.
      ...(currency !== settings.currency ? { currency } : {}),
      ...(minimum !== null && minimum !== settings.minimumInvestment
        ? { minimumInvestment: minimum }
        : {}),
      ...(cap !== null && cap !== settings.maxRoiPercent ? { maxRoiPercent: cap } : {}),
      ...(capBasis !== settings.maxRoiBasis ? { maxRoiBasis: capBasis } : {}),
      ...(notice !== null && notice !== settings.defaultNoticePeriodDays
        ? { defaultNoticePeriodDays: notice }
        : {}),
      ...(stepUp !== settings.requireStepUpToPublish ? { requireStepUpToPublish: stepUp } : {}),
      ...(disablingStepUp ? { password } : {}),
    });

    close();
  }

  function close(): void {
    setCurrency(settings.currency);
    setMinimum(settings.minimumInvestment);
    setCap(settings.maxRoiPercent);
    setCapBasis(settings.maxRoiBasis);
    setNotice(settings.defaultNoticePeriodDays);
    setStepUp(settings.requireStepUpToPublish);
    // Wiped on every close, successful or not.
    setPassword('');
    update.reset();
    onClose();
  }

  const failure =
    update.error instanceof ApiRequestError
      ? update.error.message
      : update.error
        ? t('failed')
        : null;

  const dirty =
    currency !== settings.currency ||
    minimum !== settings.minimumInvestment ||
    cap !== settings.maxRoiPercent ||
    capBasis !== settings.maxRoiBasis ||
    notice !== settings.defaultNoticePeriodDays ||
    stepUp !== settings.requireStepUpToPublish;

  const complete = minimum !== null && cap !== null && notice !== null;
  const canSubmit = dirty && complete && (!disablingStepUp || password.length > 0);

  const capYearly = cap === null ? null : annualisedRoi(cap, capBasis);

  return (
    <Drawer
      open={open}
      onClose={close}
      side="end"
      size="md"
      title={t('title')}
      description={t('description')}
      footer={
        <>
          <Button variant="outline" onClick={close} disabled={update.isPending}>
            {tActions('cancel')}
          </Button>
          <Button
            variant="gradient"
            iconStart={<Save />}
            loading={update.isPending}
            disabled={!canSubmit}
            onClick={() => void submit()}
          >
            {tActions('save')}
          </Button>
        </>
      }
    >
      <div className="space-y-5">
        {failure ? (
          <InfoCard tone="danger" announce>
            {failure}
          </InfoCard>
        ) : null}

        {/* --- what this would do to the live ladder ------------------- */}
        {impact.length > 0 ? (
          <InfoCard tone="warning" announce>
            <span className="flex flex-col gap-2">
              <span className="font-medium">{t('impactTitle')}</span>
              <span>{t('impactBody')}</span>
              <ul className="list-disc space-y-1 ps-5">
                {impact.map((issue) => (
                  <li key={`${issue.code}-${issue.tierIndex ?? 'all'}`}>
                    {tIssues(issue.code, {
                      tier: (issue.tierIndex ?? 0) + 1,
                      ...(issue.values ?? {}),
                    })}
                  </li>
                ))}
              </ul>
            </span>
          </InfoCard>
        ) : null}

        {ladderUnavailable ? (
          // Said rather than omitted: an absent warning should not be mistaken
          // for "nothing would break".
          <InfoCard tone="neutral">{t('impactUnknown')}</InfoCard>
        ) : null}

        <FormField required>
          <FormLabel>{t('minimum')}</FormLabel>
          <CurrencyInput
            value={minimum}
            onValueChange={setMinimum}
            currency={currency}
            locale={intlLocaleOf(locale)}
            decimals={0}
          />
          <FormDescription>{t('minimumHelp')}</FormDescription>
        </FormField>

        <FormField required>
          <FormLabel>{t('cap')}</FormLabel>
          <Input
            type="number"
            inputMode="decimal"
            min={0.001}
            max={999}
            step="any"
            suffix="%"
            value={cap === null ? '' : String(cap)}
            onChange={(event) =>
              setCap(event.target.value === '' ? null : Number(event.target.value))
            }
          />
          <FormDescription>{t('capHelp')}</FormDescription>
        </FormField>

        <FormField required>
          <FormLabel>{t('capBasis')}</FormLabel>
          <Select
            value={capBasis}
            onChange={(event) => setCapBasis(event.target.value as RoiBasis)}
            options={ROI_BASES.map((value) => ({ value, label: tBasis(value) }))}
          />
          {/* The yearly equivalent, always. A cap of 10% means two wildly
              different things depending on this dropdown, and this is the one
              line that makes which clear. */}
          <FormDescription>
            {capYearly === null ? t('capBasisHelp') : t('capYearly', { percent: capYearly })}
          </FormDescription>
        </FormField>

        <FormField required>
          <FormLabel>{t('notice')}</FormLabel>
          <Input
            type="number"
            inputMode="numeric"
            min={0}
            max={365}
            suffix={t('days')}
            value={notice === null ? '' : String(notice)}
            onChange={(event) =>
              setNotice(event.target.value === '' ? null : Number(event.target.value))
            }
          />
          <FormDescription>{t('noticeHelp')}</FormDescription>
        </FormField>

        <FormField required>
          <FormLabel>{t('currency')}</FormLabel>
          <Input
            value={currency}
            maxLength={3}
            onChange={(event) => setCurrency(event.target.value.toUpperCase())}
          />
          <FormDescription>{t('currencyHelp')}</FormDescription>
        </FormField>

        {/* --- the control itself -------------------------------------- */}
        <div className="bg-surface-subtle space-y-3 rounded-lg border border-border p-3">
          <Switch
            checked={stepUp}
            onChange={(event) => setStepUp(event.target.checked)}
            label={t('stepUp')}
            description={t('stepUpHelp')}
          />

          {disablingStepUp ? (
            <>
              <InfoCard tone="danger">{t('stepUpOffWarning')}</InfoCard>

              <FormField required>
                <FormLabel>{t('password')}</FormLabel>
                <PasswordInput
                  autoComplete="current-password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                />
                {/* Said plainly, because it reads as circular until you see
                    why: the alternative is a control anybody can remove. */}
                <FormDescription>{t('passwordHelp')}</FormDescription>
              </FormField>
            </>
          ) : null}
        </div>
      </div>
    </Drawer>
  );
}
