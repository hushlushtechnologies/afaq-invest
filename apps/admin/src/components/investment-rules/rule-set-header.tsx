'use client';

import { ApiRequestError } from '@afaq/api-client';
import { Archive, Copy, Pencil, Rocket, Trash2, X } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import { useState, type ReactNode } from 'react';
import type { InvestmentSettings, Locale, RuleSetDetail } from '@afaq/types';
import { Button, Card, CardBody, ConfirmationDialog, InfoCard, Textarea } from '@afaq/ui';
import { formatDateTime } from '@afaq/utils';
import { Can } from '@/components/auth/can';
import { useRouter } from '@/i18n/navigation';
import {
  useArchiveRuleSet,
  useDeleteRuleSet,
} from '@/lib/investment-rules/use-investment-rule-mutations';
import { PublishDialog } from './publish-dialog';
import { RuleSetScopeBadge, RuleSetStatusBadge } from './rule-set-badges';

/** Which confirmation is open, if any. */
type Pending = 'archive' | 'delete' | null;

/**
 * A rule set's heading, and everything that can be done to it.
 *
 * Which actions appear depends entirely on the status, and the policy on the
 * API refuses the rest regardless. A draft can be edited, published or
 * discarded; the live one can only be archived or copied; an archived one can
 * only be copied. That last restriction is the important one — an archived
 * version is the record of what investors were sold, so there is deliberately
 * no path to changing or deleting it from anywhere in this interface.
 */
export function RuleSetHeader({
  ruleSet,
  settings,
  editing,
  onToggleEdit,
  onCopy,
}: {
  ruleSet: RuleSetDetail;
  settings: InvestmentSettings;
  editing: boolean;
  onToggleEdit: () => void;
  /** Opens the "new version from this one" drawer. */
  onCopy: () => void;
}): ReactNode {
  const t = useTranslations('investmentRules.detail');
  const tActions = useTranslations('actions');
  const locale = useLocale() as Locale;
  const router = useRouter();

  const archive = useArchiveRuleSet();
  const remove = useDeleteRuleSet();

  const [pending, setPending] = useState<Pending>(null);
  const [publishing, setPublishing] = useState(false);
  const [reason, setReason] = useState('');
  const [failure, setFailure] = useState<string | null>(null);

  const isDraft = ruleSet.status === 'DRAFT';
  const isLive = ruleSet.status === 'ACTIVE';

  async function confirm(): Promise<void> {
    setFailure(null);

    try {
      if (pending === 'archive') {
        await archive.mutateAsync({ id: ruleSet.id, reason: reason.trim() || undefined });
      } else if (pending === 'delete') {
        await remove.mutateAsync({ id: ruleSet.id });
        // The record is gone, so staying on its page would show a 404 the
        // moment anything refetched.
        router.push('/investments/rules');
      }
    } catch (error) {
      setFailure(error instanceof ApiRequestError ? error.message : t('actionFailed'));
      // Rethrown so the dialog stays open and the message can be read.
      throw error;
    }
  }

  return (
    <>
      <Card>
        <CardBody className="space-y-4">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="min-w-0 space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-heading-4 text-fg">{ruleSet.name}</h1>
                <span className="text-body-small text-numeric text-fg-muted">
                  v{ruleSet.version}
                </span>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <RuleSetStatusBadge status={ruleSet.status} />
                <RuleSetScopeBadge scope={ruleSet.scope} companyName={ruleSet.companyName} />
              </div>

              {/* Who published it and when. The whole point of keeping old
                  versions is being able to answer that two years later. */}
              {ruleSet.publishedAt ? (
                <p className="text-caption text-fg-muted">
                  {t('publishedBy', {
                    who: ruleSet.publishedByName ?? t('someone'),
                    when: formatDateTime(ruleSet.publishedAt, { locale }),
                  })}
                </p>
              ) : (
                <p className="text-caption text-fg-muted">
                  {t('createdBy', {
                    who: ruleSet.createdByName ?? t('someone'),
                    when: formatDateTime(ruleSet.createdAt, { locale }),
                  })}
                </p>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Can permission="investment_rule.manage">
                {/* Copying is offered whatever the status: it is how a live
                    ladder is changed, and how an archived one is brought
                    back. */}
                <Button variant="outline" iconStart={<Copy />} onClick={onCopy}>
                  {t('newVersion')}
                </Button>

                {isDraft ? (
                  <>
                    <Button
                      variant={editing ? 'ghost' : 'outline'}
                      iconStart={editing ? <X /> : <Pencil />}
                      onClick={onToggleEdit}
                    >
                      {editing ? tActions('cancel') : t('edit')}
                    </Button>

                    <Button
                      variant="gradient"
                      iconStart={<Rocket />}
                      onClick={() => setPublishing(true)}
                    >
                      {t('publish')}
                    </Button>

                    <Button
                      variant="ghost"
                      iconStart={<Trash2 />}
                      onClick={() => setPending('delete')}
                    >
                      {tActions('delete')}
                    </Button>
                  </>
                ) : null}

                {isLive ? (
                  <Button
                    variant="outline"
                    iconStart={<Archive />}
                    onClick={() => setPending('archive')}
                  >
                    {t('archive')}
                  </Button>
                ) : null}
              </Can>
            </div>
          </div>

          {ruleSet.notes ? (
            <p className="text-body-small whitespace-pre-line text-fg-secondary">{ruleSet.notes}</p>
          ) : null}

          {/* Said plainly on the page rather than only discovered when an
              edit is refused. */}
          {ruleSet.status === 'ARCHIVED' ? (
            <InfoCard tone="neutral">{t('archivedNote')}</InfoCard>
          ) : null}
          {isLive ? <InfoCard tone="info">{t('liveNote')}</InfoCard> : null}
        </CardBody>
      </Card>

      <PublishDialog
        ruleSet={ruleSet}
        requiresPassword={settings.requireStepUpToPublish}
        open={publishing}
        onClose={() => setPublishing(false)}
      />

      <ConfirmationDialog
        open={pending !== null}
        onClose={() => {
          setPending(null);
          setReason('');
          setFailure(null);
        }}
        onConfirm={confirm}
        tone={pending === 'delete' ? 'danger' : 'warning'}
        title={pending === 'delete' ? t('confirm.deleteTitle') : t('confirm.archiveTitle')}
        message={
          <span className="flex flex-col gap-3">
            <span>
              {failure ??
                (pending === 'delete' ? t('confirm.deleteBody') : t('confirm.archiveBody'))}
            </span>

            {/* Only for archiving. Deleting a draft takes nothing away that
                anybody will come back asking about. */}
            {pending === 'archive' ? (
              <label className="flex flex-col gap-1.5 text-start">
                <span className="text-label text-fg-secondary">{t('confirm.reason')}</span>
                <Textarea
                  rows={2}
                  maxLength={500}
                  value={reason}
                  onChange={(event) => setReason(event.target.value)}
                  placeholder={t('confirm.reasonPlaceholder')}
                />
              </label>
            ) : null}
          </span>
        }
        confirmLabel={pending === 'delete' ? tActions('delete') : t('archive')}
        cancelLabel={tActions('cancel')}
      />
    </>
  );
}
