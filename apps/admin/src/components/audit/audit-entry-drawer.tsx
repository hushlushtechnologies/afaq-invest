'use client';

import { useLocale, useTranslations } from 'next-intl';
import { useState, type ReactNode } from 'react';
import type { AuditCategory, AuditLogListItem, Locale } from '@afaq/types';
import { Badge, Button, Drawer, InfoCard, type BadgeVariant } from '@afaq/ui';
import { formatDateTime } from '@afaq/utils';
import { useActionLabel } from './audit-action-label';
import { AuditChanges } from './audit-changes';
import { AuditLadderDiff, hasRecordedLadder } from './audit-ladder-diff';
import { AuditMetadata } from './audit-metadata';

/**
 * One audit entry in full, including what changed.
 *
 * Four sections, in the order somebody reads them: who and when, the tiers if
 * the entry recorded any, the field-by-field change, and the extra detail.
 * The stored record itself is last and folded away — it is the answer to "the
 * summary above is not telling me what I need", not the first thing anybody
 * should have to read.
 *
 * The tiers come before the change table on purpose. An entry that publishes
 * a rule set has one meaningful payload, the ladder, and putting it after a
 * table of three scalar fields buries it.
 */
const CATEGORY_TONE: Record<AuditCategory, BadgeVariant> = {
  AUTH: 'neutral',
  STAFF: 'info',
  ROLE: 'info',
  PERMISSION: 'warning',
  SECURITY: 'danger',
  SETTINGS: 'neutral',
  COMPANY: 'info',
  INVESTMENT_RULE: 'primary',
};

export function AuditEntryDrawer({
  entry,
  onClose,
}: {
  entry: AuditLogListItem | null;
  onClose: () => void;
}): ReactNode {
  const t = useTranslations('audit.detail');
  const tCategories = useTranslations('audit.categories');
  const locale = useLocale() as Locale;
  const actionLabel = useActionLabel();

  const [showRaw, setShowRaw] = useState(false);

  const label = entry ? actionLabel(entry.action) : null;

  // The ladder renderer owns this field, so the change table leaves it out
  // rather than showing a row of JSON beside a perfectly readable section.
  const ladderShown = hasRecordedLadder(entry?.after) || hasRecordedLadder(entry?.before);

  function close(): void {
    // Folded away again on every open, so one entry's raw payload is not
    // still on screen when the next one is opened.
    setShowRaw(false);
    onClose();
  }

  return (
    <Drawer
      open={entry !== null}
      onClose={close}
      side="end"
      size="lg"
      title={label?.text ?? ''}
      description={entry ? formatDateTime(entry.occurredAt, { locale }) : undefined}
      footer={
        <Button variant="outline" onClick={close}>
          {t('close')}
        </Button>
      }
    >
      <div className="space-y-5">
        {/* Said rather than left to be guessed at: a dotted key in the title
            is a gap in this build, not a strangely named event. */}
        {entry && label && !label.known ? (
          <InfoCard tone="neutral">{t('unknownAction')}</InfoCard>
        ) : null}

        <dl className="grid gap-3 sm:grid-cols-2">
          <Fact label={t('actor')} value={entry?.actorEmail} />
          <Fact label={t('target')} value={entry?.targetLabel ?? entry?.targetType} />
          <Fact
            label={t('category')}
            value={
              entry ? (
                <Badge size="sm" variant={CATEGORY_TONE[entry.category] ?? 'neutral'}>
                  {tCategories.has(entry.category as never)
                    ? tCategories(entry.category as never)
                    : entry.category}
                </Badge>
              ) : null
            }
          />
          {/* Only shown when we have one: most entries are written by the API
              on behalf of somebody already signed in. */}
          {entry?.ipAddress ? <Fact label={t('ipAddress')} value={entry.ipAddress} /> : null}
        </dl>

        {entry ? <AuditLadderDiff before={entry.before} after={entry.after} /> : null}

        {entry ? (
          <AuditChanges
            before={entry.before}
            after={entry.after}
            skip={ladderShown ? ['tiers'] : []}
          />
        ) : null}

        {entry ? <AuditMetadata metadata={entry.metadata} /> : null}

        {/* The record as stored. Everything above is a reading of it, and a
            reading can be wrong or incomplete — for an entry written by an
            older build, or one carrying a field this version has never heard
            of, this is the only honest answer. */}
        {entry && (entry.before || entry.after || entry.metadata) ? (
          <section className="space-y-2">
            <Button variant="ghost" size="sm" onClick={() => setShowRaw((shown) => !shown)}>
              {showRaw ? t('hideRaw') : t('showRaw')}
            </Button>

            {showRaw ? (
              <>
                <p className="text-caption text-fg-muted">{t('rawNote')}</p>
                <pre className="bg-surface-subtle overflow-x-auto rounded-lg p-3 text-caption text-fg-secondary">
                  {JSON.stringify(
                    {
                      ...(entry.before ? { before: entry.before } : {}),
                      ...(entry.after ? { after: entry.after } : {}),
                      ...(entry.metadata ? { metadata: entry.metadata } : {}),
                    },
                    null,
                    2,
                  )}
                </pre>
              </>
            ) : null}
          </section>
        ) : null}
      </div>
    </Drawer>
  );
}

function Fact({ label, value }: { label: string; value: ReactNode }): ReactNode {
  return (
    <div className="space-y-0.5">
      <dt className="text-caption text-fg-muted">{label}</dt>
      <dd className="text-body-small text-fg">{value ?? '—'}</dd>
    </div>
  );
}
