'use client';

import { Plus } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import { useMemo, useState, type ReactNode } from 'react';
import {
  acceptsInvestment,
  closingDate,
  intlLocaleOf,
  validateOpportunity,
  type Locale,
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
import { useRouter } from '@/i18n/navigation';
import { useCompanyList } from '@/lib/companies/use-companies';
import { useInvestmentSettings } from '@/lib/investment-rules/use-investment-rules';
import { toClosingInstant } from '@/lib/opportunities/closing';
import { useOpportunityIssueText } from '@/lib/opportunities/use-issue-text';
import { useOpportunityFailure } from '@/lib/opportunities/use-opportunity-failure';
import { useCreateOpportunity } from '@/lib/opportunities/use-opportunity-mutations';
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
 * Drafting a new raise.
 *
 * Only a draft: nothing typed here reaches an investor until somebody with the
 * approval permission opens it, which is a separate, audited step. That is
 * why this form asks for so little — the company, a title, a target and
 * optionally a closing date. The terms are not chosen here at all: they are
 * the company's live ladder, pinned at the moment of opening.
 *
 * The form checks itself with the same `validateOpportunity` the API runs, so
 * what it complains about is exactly what the API would refuse. Complaints
 * appear only for fields somebody has left, or after they press Create, so a
 * blank form is not born covered in red.
 */
export function CreateOpportunityDrawer({
  open,
  onClose,
  currency,
  companyId: fixedCompanyId,
}: {
  open: boolean;
  onClose: () => void;
  currency: string;
  /** Opened from a company's page: the company is already decided. */
  companyId?: string;
}): ReactNode {
  const t = useTranslations('opportunities.create');
  const tActions = useTranslations('actions');
  const locale = useLocale() as Locale;
  const router = useRouter();

  const create = useCreateOpportunity();
  const issueText = useOpportunityIssueText(currency);
  const failureOf = useOpportunityFailure(currency);
  const { data: settings } = useInvestmentSettings();
  // Every company, whatever its state: a draft may be prepared for a company
  // that is still being verified. Whether it can take money is shown, and is
  // checked again when the raise is opened.
  const { data: companies } = useCompanyList({ pageSize: 100 });

  const [companyId, setCompanyId] = useState(fixedCompanyId ?? '');
  const [title, setTitle] = useState('');
  const [summary, setSummary] = useState('');
  const [description, setDescription] = useState('');
  const [targetAmount, setTargetAmount] = useState<number | null>(null);
  const [closesOn, setClosesOn] = useState('');
  const [featured, setFeatured] = useState(false);
  const [touched, setTouched] = useState<Record<Field, boolean>>(NO_TOUCHES);
  const [attempted, setAttempted] = useState(false);

  const company = companies?.items.find((candidate) => candidate.id === companyId);

  // Today in the platform calendar, so the date picker cannot offer a day that
  // has already ended in Dubai.
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
          // Until the settings arrive, judge against zero rather than block:
          // the API checks the real minimum regardless.
          minimumInvestment: settings?.minimumInvestment ?? 0,
          currentStatus: null,
          committedAmount: 0,
          previousTarget: null,
          companyAcceptsInvestment: true,
          hasLiveLadder: true,
          opensAt: null,
          now: new Date(),
        },
      ),
    [companyId, title, targetAmount, closesOn, settings?.minimumInvestment],
  );

  // The API also wants at least two characters. The shared validation only
  // knows "blank", so the length is checked here to match rather than letting
  // the save fail with a message in the wrong language.
  const titleTooShort = title.trim().length === 1;
  const blocked = issues.length > 0 || titleTooShort;

  /** The first issue for a field, worded — once the field has been visited. */
  function errorFor(field: Field): string | undefined {
    if (!attempted && !touched[field]) return undefined;
    const issue = issues.find((candidate) => candidate.field === field);
    if (issue) return issueText(issue);
    if (field === 'title' && titleTooShort) return t('titleTooShort');
    return undefined;
  }

  function touch(field: Field): void {
    setTouched((current) => (current[field] ? current : { ...current, [field]: true }));
  }

  async function submit(): Promise<void> {
    setAttempted(true);
    if (blocked) return;

    let created: { id: string };
    try {
      created = await create.mutateAsync({
        companyId,
        title: title.trim(),
        summary: summary.trim() || null,
        description: description.trim() || null,
        targetAmount: targetAmount ?? 0,
        closesAt: toClosingInstant(closesOn),
        isFeatured: featured,
      });
    } catch {
      // Shown in the drawer from create.error; nothing more to do here.
      return;
    }

    close();
    // Straight to the draft: the next thing anybody does is read it back and
    // decide whether it is ready to open.
    router.push(`/investments/opportunities/${created.id}`);
  }

  function close(): void {
    setCompanyId(fixedCompanyId ?? '');
    setTitle('');
    setSummary('');
    setDescription('');
    setTargetAmount(null);
    setClosesOn('');
    setFeatured(false);
    setTouched(NO_TOUCHES);
    setAttempted(false);
    create.reset();
    onClose();
  }

  // Translated from the API's reason, with every issue it listed. Reaching
  // this after the form's own checks means something changed on the server in
  // between — the minimum investment was raised, say.
  const failure = failureOf(create.error);

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
          <Button variant="outline" onClick={close}>
            {tActions('cancel')}
          </Button>
          <Button
            variant="gradient"
            iconStart={<Plus />}
            loading={create.isPending}
            disabled={create.isPending || (attempted && blocked)}
            onClick={() => void submit()}
          >
            {t('submit')}
          </Button>
        </>
      }
    >
      <div className="space-y-5">
        <OpportunityFailureCard failure={failure} />

        <InfoCard tone="info">{t('draftNote')}</InfoCard>

        <FormField required error={errorFor('companyId')}>
          <FormLabel>{t('company')}</FormLabel>
          <Select
            value={companyId}
            disabled={fixedCompanyId !== undefined}
            onChange={(event) => setCompanyId(event.target.value)}
            onBlur={() => touch('companyId')}
            options={[
              { value: '', label: t('chooseCompany') },
              ...(companies?.items ?? []).map((candidate) => ({
                value: candidate.id,
                label: candidate.name,
              })),
            ]}
          />
          <FormMessage />
          {company && !acceptsInvestment(company) ? (
            // Not an error: drafting is allowed. It is the reason Open will be
            // refused later, said now rather than discovered then.
            <FormDescription>{t('companyNotAccepting', { name: company.name })}</FormDescription>
          ) : (
            <FormDescription>{t('companyHelp')}</FormDescription>
          )}
        </FormField>

        <FormField required error={errorFor('title')}>
          <FormLabel>{t('titleLabel')}</FormLabel>
          <Input
            value={title}
            maxLength={160}
            onChange={(event) => setTitle(event.target.value)}
            onBlur={() => touch('title')}
            placeholder={t('titlePlaceholder')}
          />
          <FormMessage />
          <FormDescription>{t('titleHelp')}</FormDescription>
        </FormField>

        <FormField>
          <FormLabel>{t('summary')}</FormLabel>
          <Input
            value={summary}
            maxLength={400}
            onChange={(event) => setSummary(event.target.value)}
            placeholder={t('summaryPlaceholder')}
          />
          <FormDescription>{t('summaryHelp')}</FormDescription>
        </FormField>

        <FormField>
          <FormLabel>{t('descriptionLabel')}</FormLabel>
          <Textarea
            rows={5}
            maxLength={8000}
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            placeholder={t('descriptionPlaceholder')}
          />
        </FormField>

        <FormField required error={errorFor('targetAmount')}>
          <FormLabel>{t('target')}</FormLabel>
          <CurrencyInput
            value={targetAmount}
            onValueChange={setTargetAmount}
            onBlur={() => touch('targetAmount')}
            currency={currency}
            locale={intlLocaleOf(locale)}
            decimals={0}
          />
          <FormMessage />
          <FormDescription>{t('targetHelp')}</FormDescription>
        </FormField>

        <FormField error={errorFor('closesAt')}>
          <FormLabel>{t('closesOn')}</FormLabel>
          <Input
            type="date"
            value={closesOn}
            min={today}
            onChange={(event) => setClosesOn(event.target.value)}
            onBlur={() => touch('closesAt')}
          />
          <FormMessage />
          {/* The rule that decides what "the 31st" means, said once where the
              date is picked. */}
          <FormDescription>{t('closesOnHelp')}</FormDescription>
        </FormField>

        <Switch
          label={t('featured')}
          description={t('featuredHelp')}
          checked={featured}
          onChange={(event) => setFeatured(event.target.checked)}
        />
      </div>
    </Drawer>
  );
}
