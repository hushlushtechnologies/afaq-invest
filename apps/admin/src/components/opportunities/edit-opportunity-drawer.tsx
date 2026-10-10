'use client';

import { Save } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import { useMemo, useState, type ReactNode } from 'react';
import {
  closingDate,
  intlLocaleOf,
  termsAreLocked,
  validateOpportunity,
  type Locale,
  type OpportunityDetail,
  type OpportunityIssue,
} from '@afaq/types';
import {
  Button,
  CurrencyInput,
  Drawer,
  FormDescription,
  FormField,
  FormLabel,
  FormMessage,
  InfoCard,
  Input,
  Select,
  Switch,
  Textarea,
} from '@afaq/ui';
import { formatCurrency } from '@afaq/utils';
import { useCompanyList } from '@/lib/companies/use-companies';
import { useInvestmentSettings } from '@/lib/investment-rules/use-investment-rules';
import { toClosingField, toClosingInstant } from '@/lib/opportunities/closing';
import { useOpportunityIssueText } from '@/lib/opportunities/use-issue-text';
import { useOpportunityFailure } from '@/lib/opportunities/use-opportunity-failure';
import {
  useUpdateOpportunity,
  type OpportunityChanges,
} from '@/lib/opportunities/use-opportunity-mutations';
import { OpportunityFailureCard } from './opportunity-failure-card';

/** The fields that can carry an issue, and so can be "touched". */
type Field = 'companyId' | 'title' | 'targetAmount' | 'closesAt';

const NO_TOUCHES: Record<Field, boolean> = {
  companyId: false,
  title: false,
  targetAmount: false,
  closesAt: false,
};

/**
 * Changing a raise's details.
 *
 * What may change depends on where the raise is, and the form says so rather
 * than letting the API refuse:
 *
 * - A draft may change anything, including which company it belongs to.
 * - Once opened, the company is fixed and the target can only go up. The
 *   wording, the closing date and whether it is featured stay editable, so a
 *   typo in a live raise is a quick fix rather than a cancellation.
 *
 * Only changed fields are sent. The audit trail then records exactly what was
 * edited, and an untouched form cannot be saved at all.
 *
 * The parent mounts this with `key={opportunity.updatedAt}`, so after a save
 * — or after somebody else's — the fields start again from what is stored
 * rather than from a stale copy.
 */
export function EditOpportunityDrawer({
  opportunity,
  currency,
  open,
  onClose,
}: {
  opportunity: OpportunityDetail;
  currency: string;
  open: boolean;
  onClose: () => void;
}): ReactNode {
  const t = useTranslations('opportunities.edit');
  // The field labels are the create form's: the same fields, the same words.
  const tField = useTranslations('opportunities.create');
  const tActions = useTranslations('actions');
  const locale = useLocale() as Locale;

  const update = useUpdateOpportunity();
  const issueText = useOpportunityIssueText(currency);
  const failureOf = useOpportunityFailure(currency);
  const { data: settings } = useInvestmentSettings();

  const locked = termsAreLocked(opportunity.status);
  const live = opportunity.status === 'OPEN' || opportunity.status === 'SUSPENDED';

  // Used only while it is a draft — the one state in which the company can
  // change. The same query the create form makes, so it is usually cached.
  const { data: companies } = useCompanyList({ pageSize: 100 });

  const initialClosesOn = toClosingField(opportunity.closesAt);

  const [companyId, setCompanyId] = useState(opportunity.companyId);
  const [title, setTitle] = useState(opportunity.title);
  const [summary, setSummary] = useState(opportunity.summary ?? '');
  const [description, setDescription] = useState(opportunity.description ?? '');
  const [targetAmount, setTargetAmount] = useState<number | null>(opportunity.targetAmount);
  const [closesOn, setClosesOn] = useState(initialClosesOn);
  const [featured, setFeatured] = useState(opportunity.isFeatured);
  const [touched, setTouched] = useState<Record<Field, boolean>>(NO_TOUCHES);
  const [attempted, setAttempted] = useState(false);

  const today = closingDate(new Date());

  const issues: OpportunityIssue[] = useMemo(
    () =>
      validateOpportunity(
        {
          companyId,
          title,
          targetAmount: targetAmount ?? 0,
          closesAt: toClosingInstant(closesOn),
        },
        {
          minimumInvestment: settings?.minimumInvestment ?? 0,
          currentStatus: opportunity.status,
          committedAmount: opportunity.committedAmount,
          previousTarget: opportunity.targetAmount,
          // Not re-checked on an edit, on the API either: fixing a typo in a
          // live raise must not be blocked by its company being suspended.
          companyAcceptsInvestment: true,
          hasLiveLadder: true,
          opensAt: opportunity.opensAt ? new Date(opportunity.opensAt) : null,
          now: new Date(),
        },
        { live },
      ),
    [companyId, title, targetAmount, closesOn, settings?.minimumInvestment, opportunity, live],
  );

  const titleTooShort = title.trim().length === 1;
  const blocked = issues.length > 0 || titleTooShort;

  /** What differs from what is stored, in the shape the API takes. */
  const changes: OpportunityChanges = {};
  if (!locked && companyId !== opportunity.companyId) changes.companyId = companyId;
  if (title.trim() !== opportunity.title) changes.title = title.trim();
  if ((summary.trim() || null) !== opportunity.summary) changes.summary = summary.trim() || null;
  if ((description.trim() || null) !== opportunity.description) {
    changes.description = description.trim() || null;
  }
  if (targetAmount !== null && targetAmount !== opportunity.targetAmount) {
    changes.targetAmount = targetAmount;
  }
  // Compared as the day shown, not the stored instant: a deadline saved at
  // some other time of day must not count as changed just by being displayed.
  if (closesOn !== initialClosesOn) changes.closesAt = toClosingInstant(closesOn);
  if (featured !== opportunity.isFeatured) changes.isFeatured = featured;

  const changed = Object.keys(changes).length > 0;

  function errorFor(field: Field): string | undefined {
    if (!attempted && !touched[field]) return undefined;
    const issue = issues.find((candidate) => candidate.field === field);
    if (issue) return issueText(issue);
    if (field === 'title' && titleTooShort) return tField('titleTooShort');
    return undefined;
  }

  function touch(field: Field): void {
    setTouched((current) => (current[field] ? current : { ...current, [field]: true }));
  }

  /** Back to what is stored, for every way out that does not save. */
  function reset(): void {
    setCompanyId(opportunity.companyId);
    setTitle(opportunity.title);
    setSummary(opportunity.summary ?? '');
    setDescription(opportunity.description ?? '');
    setTargetAmount(opportunity.targetAmount);
    setClosesOn(initialClosesOn);
    setFeatured(opportunity.isFeatured);
    setTouched(NO_TOUCHES);
    setAttempted(false);
    update.reset();
  }

  function close(): void {
    reset();
    onClose();
  }

  async function submit(): Promise<void> {
    setAttempted(true);
    if (blocked || !changed) return;

    try {
      await update.mutateAsync({ id: opportunity.id, changes });
    } catch {
      // Shown in the drawer from update.error.
      return;
    }

    // No reset here: the save changes `updatedAt`, the parent's key changes
    // with it, and the drawer comes back fresh from what was stored.
    update.reset();
    onClose();
  }

  const failure = failureOf(update.error);

  return (
    <Drawer
      open={open}
      onClose={close}
      side="end"
      size="md"
      title={t('title')}
      description={t('description', { title: opportunity.title })}
      footer={
        <>
          <Button variant="outline" onClick={close}>
            {tActions('cancel')}
          </Button>
          <Button
            variant="gradient"
            iconStart={<Save />}
            loading={update.isPending}
            disabled={update.isPending || !changed || (attempted && blocked)}
            onClick={() => void submit()}
          >
            {tActions('save')}
          </Button>
        </>
      }
    >
      <div className="space-y-5">
        <OpportunityFailureCard failure={failure} />

        {/* Said once at the top, so the disabled company field and the target
            note below read as the rule they are rather than as a glitch. */}
        {locked ? <InfoCard tone="info">{t('lockedNote')}</InfoCard> : null}

        <FormField required error={errorFor('companyId')}>
          <FormLabel>{tField('company')}</FormLabel>
          {locked ? (
            <Input value={opportunity.companyName} disabled readOnly />
          ) : (
            <Select
              value={companyId}
              onChange={(event) => setCompanyId(event.target.value)}
              onBlur={() => touch('companyId')}
              options={(companies?.items ?? []).map((candidate) => ({
                value: candidate.id,
                label: candidate.name,
              }))}
            />
          )}
          <FormMessage />
          <FormDescription>{locked ? t('companyLocked') : tField('companyHelp')}</FormDescription>
        </FormField>

        <FormField required error={errorFor('title')}>
          <FormLabel>{tField('titleLabel')}</FormLabel>
          <Input
            value={title}
            maxLength={160}
            onChange={(event) => setTitle(event.target.value)}
            onBlur={() => touch('title')}
          />
          <FormMessage />
          {/* The address stays put on a rename, which is worth saying here:
              somebody renaming a live raise may wonder about shared links. */}
          <FormDescription>{t('titleHelp')}</FormDescription>
        </FormField>

        <FormField>
          <FormLabel>{tField('summary')}</FormLabel>
          <Input
            value={summary}
            maxLength={400}
            onChange={(event) => setSummary(event.target.value)}
            placeholder={tField('summaryPlaceholder')}
          />
          <FormDescription>{tField('summaryHelp')}</FormDescription>
        </FormField>

        <FormField>
          <FormLabel>{tField('descriptionLabel')}</FormLabel>
          <Textarea
            rows={6}
            maxLength={8000}
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            placeholder={tField('descriptionPlaceholder')}
          />
        </FormField>

        <FormField required error={errorFor('targetAmount')}>
          <FormLabel>{tField('target')}</FormLabel>
          <CurrencyInput
            value={targetAmount}
            onValueChange={setTargetAmount}
            onBlur={() => touch('targetAmount')}
            currency={currency}
            locale={intlLocaleOf(locale)}
            decimals={0}
          />
          <FormMessage />
          <FormDescription>
            {locked
              ? t('targetLocked', {
                  current: formatCurrency(opportunity.targetAmount, {
                    locale,
                    currency,
                    whole: true,
                  }),
                })
              : tField('targetHelp')}
          </FormDescription>
        </FormField>

        <FormField error={errorFor('closesAt')}>
          <FormLabel>{tField('closesOn')}</FormLabel>
          <Input
            type="date"
            value={closesOn}
            min={today}
            onChange={(event) => setClosesOn(event.target.value)}
            onBlur={() => touch('closesAt')}
          />
          <FormMessage />
          <FormDescription>{live ? t('closesOnLive') : tField('closesOnHelp')}</FormDescription>
        </FormField>

        <Switch
          label={tField('featured')}
          description={tField('featuredHelp')}
          checked={featured}
          onChange={(event) => setFeatured(event.target.checked)}
        />
      </div>
    </Drawer>
  );
}
