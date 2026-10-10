'use client';

import { ApiRequestError } from '@afaq/api-client';
import { Ban, Flag, Pause, Play, Rocket, type LucideIcon } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useState, type ReactNode } from 'react';
import {
  MAX_MOVE_REASON_LENGTH,
  MIN_MOVE_REASON_LENGTH,
  OPPORTUNITY_MOVES_NEEDING_REASON,
  validateOpportunity,
  type OpportunityDetail,
  type OpportunityMove,
} from '@afaq/types';
import {
  Button,
  FormDescription,
  FormField,
  FormLabel,
  InfoCard,
  Modal,
  Spinner,
  Textarea,
  type ButtonVariant,
  type InfoCardTone,
} from '@afaq/ui';
import { useCompanyBySlug } from '@/lib/companies/use-companies';
import {
  useActiveRuleSet,
  useInvestmentSettings,
} from '@/lib/investment-rules/use-investment-rules';
import { useOpportunityIssueText } from '@/lib/opportunities/use-issue-text';
import { useOpportunityFailure } from '@/lib/opportunities/use-opportunity-failure';
import { useMoveOpportunity } from '@/lib/opportunities/use-opportunity-mutations';
import { OpportunityFailureCard } from './opportunity-failure-card';

/** How each move looks: its icon, button, and warning tone. */
export const MOVE_STYLE: Record<
  OpportunityMove,
  { Icon: LucideIcon; confirm: ButtonVariant; tone: InfoCardTone }
> = {
  open: { Icon: Rocket, confirm: 'gradient', tone: 'info' },
  resume: { Icon: Play, confirm: 'gradient', tone: 'info' },
  suspend: { Icon: Pause, confirm: 'primary', tone: 'warning' },
  close: { Icon: Flag, confirm: 'primary', tone: 'warning' },
  cancel: { Icon: Ban, confirm: 'danger', tone: 'danger' },
};

/** Closing or cancelling cannot be undone. */
const FINAL_MOVES: readonly OpportunityMove[] = ['close', 'cancel'];

/**
 * Confirming an opportunity status change.
 *
 * The same validation used by the API previews opening/resuming issues. If a
 * preflight request is forbidden or unavailable, the API remains authoritative.
 */
export function OpportunityMoveDialog({
  opportunity,
  move,
  currency,
  open,
  onClose,
}: {
  opportunity: OpportunityDetail;
  move: OpportunityMove;
  currency: string;
  open: boolean;
  onClose: () => void;
}): ReactNode {
  const t = useTranslations('opportunities.moves');
  const tActions = useTranslations('actions');

  const mutation = useMoveOpportunity();
  const issueText = useOpportunityIssueText(currency);
  const failureOf = useOpportunityFailure(currency);
  const { data: settings } = useInvestmentSettings();
  const [reason, setReason] = useState('');

  const checks = open && (move === 'open' || move === 'resume');

  // The existing useCompanyBySlug hook accepts undefined to skip the check.
  const company = useCompanyBySlug(checks ? opportunity.companySlug : undefined);

  // The project's current useActiveRuleSet hook accepts ONE argument only.
  // Removing the unsupported { enabled } argument fixes TS2554. It may fetch
  // while the modal is closed; optional gating requires changing that hook.
  const ladder = useActiveRuleSet(opportunity.companyId);

  const nothingLive =
    ladder.error instanceof ApiRequestError &&
    (ladder.error.statusCode === 409 || ladder.error.statusCode === 404);

  const checking = checks && (company.isLoading || (move === 'open' && ladder.isLoading));

  const issues = checks
    ? validateOpportunity(
        {
          companyId: opportunity.companyId,
          title: opportunity.title,
          targetAmount: opportunity.targetAmount,
          closesAt: opportunity.closesAt,
        },
        {
          minimumInvestment: settings?.minimumInvestment ?? 0,
          currentStatus: opportunity.status,
          committedAmount: opportunity.committedAmount,
          previousTarget: null,
          companyAcceptsInvestment: company.data?.acceptsInvestment ?? true,
          // Resuming retains pinned terms; opening requires live rules.
          hasLiveLadder: move === 'resume' ? true : !nothingLive,
          opensAt: opportunity.opensAt ? new Date(opportunity.opensAt) : null,
          now: new Date(),
        },
        { opening: true },
      )
    : [];

  const needsReason = OPPORTUNITY_MOVES_NEEDING_REASON.includes(move);
  const trimmed = reason.trim();
  const reasonOk = needsReason ? trimmed.length >= MIN_MOVE_REASON_LENGTH : true;
  const style = MOVE_STYLE[move];

  function close(): void {
    setReason('');
    mutation.reset();
    onClose();
  }

  async function submit(): Promise<void> {
    try {
      await mutation.mutateAsync({
        id: opportunity.id,
        move,
        reason: trimmed || undefined,
      });
    } catch {
      // The mutation error is displayed inside this dialog.
      return;
    }

    close();
  }

  const failure = failureOf(mutation.error);

  return (
    <Modal
      open={open}
      onClose={close}
      size="md"
      dismissible={!mutation.isPending}
      title={t(`${move}.title`, { title: opportunity.title })}
      description={t(`${move}.description`)}
      footer={
        <>
          <Button variant="outline" onClick={close} disabled={mutation.isPending}>
            {tActions('cancel')}
          </Button>
          <Button
            variant={style.confirm}
            iconStart={<style.Icon />}
            loading={mutation.isPending}
            disabled={checking || issues.length > 0 || !reasonOk}
            onClick={() => void submit()}
          >
            {t(`${move}.confirm`)}
          </Button>
        </>
      }
    >
      <div className="space-y-5">
        <OpportunityFailureCard failure={failure} />

        <InfoCard tone={style.tone}>{t(`${move}.consequence`)}</InfoCard>

        {move === 'open' && ladder.data ? (
          <p className="text-body-small text-fg-secondary">
            {t('open.pins', { name: ladder.data.name, version: ladder.data.version })}
          </p>
        ) : null}

        {checking ? (
          <p className="flex items-center gap-2 text-body-small text-fg-muted">
            <Spinner size="sm" label={t('checking')} />
            <span aria-hidden="true">{t('checking')}</span>
          </p>
        ) : issues.length > 0 ? (
          <InfoCard tone="warning" announce>
            <span className="flex flex-col gap-2">
              <span className="font-medium">{t('blocked')}</span>
              <ul className="list-disc space-y-1 ps-5">
                {issues.map((issue) => (
                  <li key={issue.code}>{issueText(issue)}</li>
                ))}
              </ul>
            </span>
          </InfoCard>
        ) : null}

        {FINAL_MOVES.includes(move) ? (
          <p className="text-body-small font-medium text-fg">{t('final')}</p>
        ) : null}

        <FormField required={needsReason}>
          <FormLabel>{needsReason ? t('reasonLabel') : t('noteLabel')}</FormLabel>
          <Textarea
            rows={3}
            maxLength={MAX_MOVE_REASON_LENGTH}
            value={reason}
            onChange={(event) => setReason(event.target.value)}
          />
          <FormDescription>
            {needsReason ? t('reasonHelp', { min: MIN_MOVE_REASON_LENGTH }) : t('noteHelp')}
          </FormDescription>
        </FormField>
      </div>
    </Modal>
  );
}
