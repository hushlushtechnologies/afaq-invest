'use client';

import { useTranslations } from 'next-intl';
import type { ReactNode } from 'react';
import type { AuditLogListItem, Locale } from '@afaq/types';
import { Badge, Button, Drawer } from '@afaq/ui';
import { formatDateTime } from '@afaq/utils';
import { useLocale } from 'next-intl';
import { useActionLabel } from './audit-action-label';

/**
 * One audit entry in full, including what changed.
 *
 * The before and after are shown side by side rather than as a raw blob: the
 * question somebody opens this to answer is "what actually changed?", and two
 * columns answer it at a glance where a JSON dump does not.
 */
export function AuditEntryDrawer({
  entry,
  onClose,
}: {
  entry: AuditLogListItem | null;
  onClose: () => void;
}): ReactNode {
  const t = useTranslations('audit.detail');
  const locale = useLocale() as Locale;
  const actionLabel = useActionLabel();

  const keys = [...new Set([...objectKeys(entry?.before), ...objectKeys(entry?.after)])];

  return (
    <Drawer
      open={entry !== null}
      onClose={onClose}
      side="end"
      size="lg"
      title={entry ? actionLabel(entry.action) : ''}
      description={entry ? formatDateTime(entry.occurredAt, { locale }) : undefined}
      footer={
        <Button variant="outline" onClick={onClose}>
          {t('close')}
        </Button>
      }
    >
      <div className="space-y-5">
        <dl className="grid gap-3 sm:grid-cols-2">
          <Fact label={t('actor')} value={entry?.actorEmail} />
          <Fact label={t('target')} value={entry?.targetLabel ?? entry?.targetType} />
          <Fact
            label={t('category')}
            value={entry ? <Badge size="sm">{entry.category}</Badge> : null}
          />
          {/* Only shown when we have one: most entries are written by the API
              on behalf of somebody already signed in. */}
          {entry?.ipAddress ? <Fact label={t('ipAddress')} value={entry.ipAddress} /> : null}
        </dl>

        {keys.length > 0 ? (
          <section className="space-y-2">
            <h3 className="text-label font-medium text-fg">{t('changes')}</h3>

            <table className="w-full text-body-small">
              <thead>
                <tr className="text-caption text-fg-muted">
                  <th scope="col" className="py-1 text-start font-medium">
                    {t('field')}
                  </th>
                  <th scope="col" className="py-1 text-start font-medium">
                    {t('before')}
                  </th>
                  <th scope="col" className="py-1 text-start font-medium">
                    {t('after')}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-subtle">
                {keys.map((key) => {
                  const before = valueOf(entry?.before, key);
                  const after = valueOf(entry?.after, key);
                  const changed = before !== after;

                  return (
                    <tr key={key}>
                      <th scope="row" className="py-2 text-start font-normal text-fg-secondary">
                        {key}
                      </th>
                      <td className="py-2 text-fg-subtle">{before || '—'}</td>
                      {/* Only the new value is emphasised; the old one is
                          context, not news. */}
                      <td className={changed ? 'py-2 font-medium text-fg' : 'py-2 text-fg-subtle'}>
                        {after || '—'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </section>
        ) : null}

        {entry?.metadata ? (
          <section className="space-y-2">
            <h3 className="text-label font-medium text-fg">{t('metadata')}</h3>
            <pre className="bg-surface-subtle overflow-x-auto rounded-lg p-3 text-caption text-fg-secondary">
              {JSON.stringify(entry.metadata, null, 2)}
            </pre>
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

function objectKeys(value: unknown): string[] {
  return value && typeof value === 'object' ? Object.keys(value as object) : [];
}

/** Arrays of roles read better as a list than as JSON. */
function valueOf(source: unknown, key: string): string {
  if (!source || typeof source !== 'object') return '';

  const value = (source as Record<string, unknown>)[key];

  if (value === undefined || value === null) return '';
  if (Array.isArray(value)) return value.join(', ');
  if (typeof value === 'object') return JSON.stringify(value);

  return String(value);
}
