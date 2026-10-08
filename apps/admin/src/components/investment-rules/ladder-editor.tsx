'use client';

import { ApiRequestError } from '@afaq/api-client';
import { Plus, Save, Trash2, Wand2 } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import { useMemo, useRef, useState, type ReactNode } from 'react';
import {
  PAYOUT_FREQUENCIES,
  validateTierLadder,
  type InvestmentSettings,
  type LadderContext,
  type LadderIssue,
  type Locale,
  type PayoutFrequency,
  type RuleSetDetail,
  type TierDraft,
} from '@afaq/types';
import {
  Button,
  Card,
  CardBody,
  CurrencyInput,
  FormField,
  FormLabel,
  IconButton,
  InfoCard,
  Input,
  Select,
  Switch,
} from '@afaq/ui';
import { intlLocaleOf } from '@afaq/types';
import {
  useReplaceLadder,
  type TierBody,
  type TierOptionBody,
} from '@/lib/investment-rules/use-investment-rule-mutations';

// ===========================================================================
// THE SHAPE THE FORM HOLDS
// ===========================================================================

/**
 * One mode's terms while being edited.
 *
 * Numbers are `null` when the box is empty rather than 0: an empty rate and a
 * rate of zero are different mistakes, and only one of them is somebody
 * halfway through typing.
 */
interface EditableOption {
  /** Whether this tier offers the mode at all. */
  enabled: boolean;
  roiPercent: number | null;
  payoutFrequency: PayoutFrequency;
  minTermMonths: number | null;
  maxTermMonths: number | null;
  noticePeriodDays: number | null;
  earnsDuringNotice: boolean;
}

interface EditableTier {
  /** Stable across edits, so React does not remount a row while it is typed in. */
  key: string;
  name: string;
  minAmount: number | null;
  /** Null means open-ended, which only the highest tier may be. */
  maxAmount: number | null;
  locked: EditableOption;
  unlocked: EditableOption;
}

const EMPTY_OPTION = (enabled: boolean, notice: number): EditableOption => ({
  enabled,
  roiPercent: null,
  payoutFrequency: 'MONTHLY',
  minTermMonths: null,
  maxTermMonths: null,
  noticePeriodDays: notice,
  earnsDuringNotice: false,
});

/**
 * Two fixed slots rather than a list of options.
 *
 * There are exactly two modes, the database enforces one option per mode per
 * tier, and a dynamic list would let somebody build a state the schema
 * refuses. Two slots with a switch each say the same thing and cannot.
 */
function fromRuleSet(ruleSet: RuleSetDetail, defaultNotice: number): EditableTier[] {
  return ruleSet.tiers.map((tier, index) => {
    const locked = tier.options.find((option) => option.mode === 'LOCKED');
    const unlocked = tier.options.find((option) => option.mode === 'UNLOCKED');

    const toEditable = (
      option: (typeof tier.options)[number] | undefined,
      fallbackNotice: number,
    ): EditableOption =>
      option
        ? {
            enabled: option.isEnabled,
            roiPercent: option.roiPercent,
            payoutFrequency: option.payoutFrequency,
            minTermMonths: option.minTermMonths,
            maxTermMonths: option.maxTermMonths,
            noticePeriodDays: option.noticePeriodDays,
            earnsDuringNotice: option.earnsDuringNotice,
          }
        : EMPTY_OPTION(false, fallbackNotice);

    return {
      key: `tier-${index}`,
      name: tier.name,
      minAmount: tier.minAmount,
      maxAmount: tier.maxAmount,
      locked: toEditable(locked, 0),
      unlocked: toEditable(unlocked, defaultNotice),
    };
  });
}

/** What the form holds, in the shape the shared validator checks. */
function toDrafts(tiers: readonly EditableTier[]): TierDraft[] {
  return tiers.map((tier) => ({
    name: tier.name,
    minAmount: tier.minAmount ?? 0,
    maxAmount: tier.maxAmount,
    options: (['locked', 'unlocked'] as const)
      .filter((slot) => tier[slot].enabled)
      .map((slot) => ({
        mode: slot === 'locked' ? ('LOCKED' as const) : ('UNLOCKED' as const),
        roiPercent: tier[slot].roiPercent ?? 0,
        payoutFrequency: tier[slot].payoutFrequency,
        minTermMonths: tier[slot].minTermMonths,
        maxTermMonths: tier[slot].maxTermMonths,
        noticePeriodDays: tier[slot].noticePeriodDays ?? 0,
        earnsDuringNotice: tier[slot].earnsDuringNotice,
      })),
  }));
}

/** What goes on the wire. */
function toBodies(tiers: readonly EditableTier[]): TierBody[] {
  return toDrafts(tiers).map((tier) => ({
    name: tier.name,
    minAmount: tier.minAmount,
    maxAmount: tier.maxAmount,
    options: tier.options.map((option): TierOptionBody => ({ ...option })),
  }));
}

/**
 * Boxes left empty, before the ladder rules are applied.
 *
 * Run first and on its own: feeding a blank field into the validator as zero
 * produces a confident message about the wrong thing ("the first tier must
 * start at 25,000, not 0") when the real answer is "you have not filled this
 * in yet".
 */
function blankFields(tiers: readonly EditableTier[]): string[] {
  const missing: string[] = [];

  tiers.forEach((tier, index) => {
    const where = tier.name.trim() || `#${index + 1}`;

    if (!tier.name.trim()) missing.push(`${index + 1}:name`);
    if (tier.minAmount === null) missing.push(`${where}:min`);

    for (const slot of ['locked', 'unlocked'] as const) {
      if (!tier[slot].enabled) continue;
      if (tier[slot].roiPercent === null) missing.push(`${where}:${slot}:roi`);
      if (tier[slot].noticePeriodDays === null) missing.push(`${where}:${slot}:notice`);
    }
  });

  return missing;
}

// ===========================================================================
// SMALL FIELDS
// ===========================================================================

/** A whole-number box that holds null when empty rather than NaN. */
function NumberField({
  value,
  onChange,
  min,
  max,
  suffix,
  label,
}: {
  value: number | null;
  onChange: (value: number | null) => void;
  min?: number;
  max?: number;
  suffix?: string;
  label: string;
}): ReactNode {
  return (
    <FormField>
      <FormLabel>{label}</FormLabel>
      <Input
        type="number"
        inputMode="numeric"
        min={min}
        max={max}
        step="any"
        suffix={suffix}
        value={value === null ? '' : String(value)}
        onChange={(event) => {
          const raw = event.target.value;
          onChange(raw === '' ? null : Number(raw));
        }}
      />
    </FormField>
  );
}

// ===========================================================================
// THE EDITOR
// ===========================================================================

/**
 * Editing a draft's ladder.
 *
 * The whole ladder is held here and sent in one go, matching the API:
 * contiguity is a property of the set, so a single tier is neither valid nor
 * invalid on its own.
 *
 * Validation is the same `validateTierLadder` the API runs, imported from
 * @afaq/types and re-run on every keystroke. That is the point of putting it
 * in a shared package: the gap you see while typing is the same gap the
 * server would refuse, worded the same way, rather than a second
 * implementation that drifts.
 */
export function LadderEditor({
  ruleSet,
  settings,
  onSaved,
}: {
  ruleSet: RuleSetDetail;
  settings: InvestmentSettings;
  onSaved?: () => void;
}): ReactNode {
  const t = useTranslations('investmentRules.editor');
  const tIssues = useTranslations('investmentRules.issues');
  const tMode = useTranslations('investmentRules.mode');
  const tPayout = useTranslations('investmentRules.payout');
  const locale = useLocale() as Locale;

  const replace = useReplaceLadder();

  const nextKey = useRef(1000);
  const [tiers, setTiers] = useState<EditableTier[]>(() =>
    fromRuleSet(ruleSet, settings.defaultNoticePeriodDays),
  );

  const context: LadderContext = useMemo(
    () => ({
      roiBasis: ruleSet.roiBasis,
      minimumInvestment: settings.minimumInvestment,
      maxRoiPercent: settings.maxRoiPercent,
      maxRoiBasis: settings.maxRoiBasis,
    }),
    [ruleSet.roiBasis, settings],
  );

  const blanks = useMemo(() => blankFields(tiers), [tiers]);

  // Only once every box has something in it. See blankFields.
  const issues: LadderIssue[] = useMemo(
    () => (blanks.length > 0 ? [] : validateTierLadder(toDrafts(tiers), context)),
    [blanks, tiers, context],
  );

  const issuesByTier = useMemo(() => {
    const byTier = new Map<number, LadderIssue[]>();

    for (const issue of issues) {
      if (issue.tierIndex === undefined) continue;
      const list = byTier.get(issue.tierIndex) ?? [];
      list.push(issue);
      byTier.set(issue.tierIndex, list);
    }

    return byTier;
  }, [issues]);

  const generalIssues = issues.filter((issue) => issue.tierIndex === undefined);

  function update(index: number, changes: Partial<EditableTier>): void {
    setTiers((current) =>
      current.map((tier, at) => (at === index ? { ...tier, ...changes } : tier)),
    );
  }

  function updateOption(
    index: number,
    slot: 'locked' | 'unlocked',
    changes: Partial<EditableOption>,
  ): void {
    setTiers((current) =>
      current.map((tier, at) =>
        at === index ? { ...tier, [slot]: { ...tier[slot], ...changes } } : tier,
      ),
    );
  }

  function addTier(): void {
    nextKey.current += 1;

    setTiers((current) => {
      const last = current.at(-1);

      // The new tier starts one above whatever the previous one ends at, and
      // the previous one loses its open end — which is the shape the rules
      // want, so adding a tier does not immediately produce two errors.
      const startsAt =
        last?.maxAmount !== null && last?.maxAmount !== undefined ? last.maxAmount + 1 : null;

      return [
        ...current,
        {
          key: `tier-new-${nextKey.current}`,
          name: t('tierName', { number: current.length + 1 }),
          minAmount: startsAt,
          maxAmount: null,
          locked: EMPTY_OPTION(true, 0),
          unlocked: EMPTY_OPTION(false, settings.defaultNoticePeriodDays),
        },
      ];
    });
  }

  function removeTier(index: number): void {
    setTiers((current) => current.filter((_, at) => at !== index));
  }

  /**
   * Closes a gap by moving the next tier's floor down to meet the ceiling
   * below it.
   *
   * Offered rather than done automatically: which of the two numbers is wrong
   * is a business question, and quietly moving one of them would be the
   * software deciding what the tiers are.
   */
  function closeGap(tierIndex: number): void {
    setTiers((current) => {
      const previous = current[tierIndex - 1];
      if (!previous || previous.maxAmount === null) return current;

      return current.map((tier, at) =>
        at === tierIndex ? { ...tier, minAmount: (previous.maxAmount as number) + 1 } : tier,
      );
    });
  }

  async function save(): Promise<void> {
    await replace.mutateAsync({ id: ruleSet.id, tiers: toBodies(tiers) });
    onSaved?.();
  }

  const failure =
    replace.error instanceof ApiRequestError
      ? replace.error.message
      : replace.error
        ? t('failed')
        : null;

  const canSave = blanks.length === 0 && issues.length === 0 && tiers.length > 0;

  const payoutOptions = PAYOUT_FREQUENCIES.map((value) => ({ value, label: tPayout(value) }));

  return (
    <div className="space-y-4">
      {failure ? (
        <InfoCard tone="danger" announce>
          {failure}
        </InfoCard>
      ) : null}

      {blanks.length > 0 ? (
        <InfoCard tone="warning">{t('blanks', { count: blanks.length })}</InfoCard>
      ) : null}

      {generalIssues.map((issue) => (
        <InfoCard key={issue.code} tone="danger" announce>
          {tIssues(issue.code, { tier: 0, ...(issue.values ?? {}) })}
        </InfoCard>
      ))}

      {tiers.map((tier, index) => {
        const tierIssues = issuesByTier.get(index) ?? [];
        const hasGap = tierIssues.some((issue) => issue.code === 'gap');

        return (
          <Card key={tier.key}>
            <CardBody className="space-y-4">
              {/* --- the range ------------------------------------------ */}
              <div className="flex flex-wrap items-end gap-3">
                <FormField className="min-w-40 flex-1">
                  <FormLabel>{t('name')}</FormLabel>
                  <Input
                    value={tier.name}
                    onChange={(event) => update(index, { name: event.target.value })}
                  />
                </FormField>

                <FormField className="min-w-40 flex-1">
                  <FormLabel>{t('from')}</FormLabel>
                  <CurrencyInput
                    value={tier.minAmount}
                    onValueChange={(value) => update(index, { minAmount: value })}
                    currency={settings.currency}
                    locale={intlLocaleOf(locale)}
                    decimals={0}
                  />
                </FormField>

                <FormField className="min-w-40 flex-1">
                  <FormLabel>{t('to')}</FormLabel>
                  <CurrencyInput
                    value={tier.maxAmount}
                    onValueChange={(value) => update(index, { maxAmount: value })}
                    currency={settings.currency}
                    locale={intlLocaleOf(locale)}
                    decimals={0}
                    placeholder={t('openEnded')}
                  />
                </FormField>

                <IconButton
                  variant="ghost"
                  icon={<Trash2 />}
                  label={t('removeTier', { name: tier.name })}
                  onClick={() => removeTier(index)}
                />
              </div>

              {/* --- what is wrong with it ------------------------------ */}
              {tierIssues.length > 0 ? (
                <div className="space-y-2">
                  {tierIssues.map((issue) => (
                    <InfoCard key={`${issue.code}-${issue.optionIndex ?? 'tier'}`} tone="danger">
                      <span className="flex flex-wrap items-center gap-3">
                        <span>
                          {tIssues(issue.code, { tier: index + 1, ...(issue.values ?? {}) })}
                        </span>
                        {issue.code === 'gap' && hasGap ? (
                          <Button
                            size="sm"
                            variant="outline"
                            iconStart={<Wand2 />}
                            onClick={() => closeGap(index)}
                          >
                            {t('closeGap')}
                          </Button>
                        ) : null}
                      </span>
                    </InfoCard>
                  ))}
                </div>
              ) : null}

              {/* --- the two modes -------------------------------------- */}
              <div className="grid gap-4 md:grid-cols-2">
                {(['locked', 'unlocked'] as const).map((slot) => {
                  const option = tier[slot];
                  const mode = slot === 'locked' ? 'LOCKED' : 'UNLOCKED';

                  return (
                    <div
                      key={slot}
                      className="bg-surface-subtle space-y-3 rounded-lg border border-border p-3"
                    >
                      <Switch
                        checked={option.enabled}
                        onChange={(event) =>
                          updateOption(index, slot, { enabled: event.target.checked })
                        }
                        label={tMode(mode)}
                      />

                      {option.enabled ? (
                        <div className="grid gap-3 sm:grid-cols-2">
                          <NumberField
                            label={t('rate')}
                            value={option.roiPercent}
                            onChange={(value) => updateOption(index, slot, { roiPercent: value })}
                            min={0}
                            suffix="%"
                          />

                          <FormField>
                            <FormLabel>{t('payout')}</FormLabel>
                            <Select
                              value={option.payoutFrequency}
                              onChange={(event) =>
                                updateOption(index, slot, {
                                  payoutFrequency: event.target.value as PayoutFrequency,
                                })
                              }
                              options={payoutOptions}
                            />
                          </FormField>

                          <NumberField
                            label={t('minTerm')}
                            value={option.minTermMonths}
                            onChange={(value) =>
                              updateOption(index, slot, { minTermMonths: value })
                            }
                            min={1}
                            max={120}
                          />

                          <NumberField
                            label={t('maxTerm')}
                            value={option.maxTermMonths}
                            onChange={(value) =>
                              updateOption(index, slot, { maxTermMonths: value })
                            }
                            min={1}
                            max={120}
                          />

                          <NumberField
                            label={t('notice')}
                            value={option.noticePeriodDays}
                            onChange={(value) =>
                              updateOption(index, slot, { noticePeriodDays: value })
                            }
                            min={0}
                            max={365}
                          />

                          <div className="flex items-end">
                            <Switch
                              checked={option.earnsDuringNotice}
                              onChange={(event) =>
                                updateOption(index, slot, {
                                  earnsDuringNotice: event.target.checked,
                                })
                              }
                              label={t('earnsDuringNotice')}
                            />
                          </div>
                        </div>
                      ) : (
                        <p className="text-caption text-fg-muted">{t('modeOff')}</p>
                      )}
                    </div>
                  );
                })}
              </div>
            </CardBody>
          </Card>
        );
      })}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <Button variant="outline" iconStart={<Plus />} onClick={addTier}>
          {t('addTier')}
        </Button>

        <Button
          variant="gradient"
          iconStart={<Save />}
          loading={replace.isPending}
          disabled={!canSave}
          onClick={() => void save()}
        >
          {t('save')}
        </Button>
      </div>
    </div>
  );
}
