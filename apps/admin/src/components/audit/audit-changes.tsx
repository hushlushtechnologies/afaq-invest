'use client';

import { useLocale, useTranslations } from 'next-intl';
import type { ReactNode } from 'react';
import type { Locale } from '@afaq/types';
import { formatNumber } from '@afaq/utils';

/**
 * What changed, field by field.
 *
 * Two columns rather than a blob, because the question somebody opens an
 * entry to answer is "what actually changed?". The field names come from the
 * message files; a field with no label falls back to the stored key in the
 * monospace face, which is ugly on purpose — it reads as an identifier rather
 * than as a sentence somebody wrote badly, and it is searchable.
 *
 * Stored values are shown verbatim, not translated. `SUSPENDED` stays
 * `SUSPENDED` in both languages. This is the one screen in the product where
 * that is the right call: an audit entry should read as what the database was
 * actually set to, so that it still means the same thing years later when the
 * wording in the interface has moved on. Booleans are the exception —
 * `false` is a programming word, not a value anybody stored on purpose.
 */

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function keysOf(value: unknown): string[] {
  return isRecord(value) ? Object.keys(value) : [];
}

export function AuditChanges({
  before,
  after,
  /** Fields another section renders in full — the recorded ladder, normally. */
  skip = [],
}: {
  before: unknown;
  after: unknown;
  skip?: readonly string[];
}): ReactNode {
  const t = useTranslations('audit.detail');
  const tFields = useTranslations('audit.fields');
  const tMeta = useTranslations('audit.metadata');
  const locale = useLocale() as Locale;

  /** A stored value as something readable, and whether it is worth comparing. */
  function render(source: unknown, key: string): { text: string; raw: boolean } {
    if (!isRecord(source)) return { text: '', raw: false };

    const value = source[key];

    if (value === undefined || value === null) return { text: '', raw: false };
    if (typeof value === 'boolean') return { text: value ? tMeta('yes') : tMeta('no'), raw: false };
    if (typeof value === 'number') {
      return { text: formatNumber(value, { locale }), raw: false };
    }

    if (Array.isArray(value)) {
      if (value.length === 0) return { text: tFields('nothing'), raw: false };

      // A handful of role keys reads well inline. A reorder writes forty
      // identifiers, and joining those produces a wall nobody reads — the
      // count is the useful fact, and the full list is in the stored record
      // the drawer can show below.
      const short = value.every(
        (item) => (typeof item === 'string' && item.length <= 40) || typeof item === 'number',
      );

      return short && value.length <= 6
        ? { text: value.join(', '), raw: false }
        : { text: t('itemCount', { count: value.length }), raw: false };
    }

    if (isRecord(value)) return { text: JSON.stringify(value), raw: true };

    return { text: String(value), raw: false };
  }

  const keys = [...new Set([...keysOf(before), ...keysOf(after)])].filter(
    (key) => !skip.includes(key),
  );

  if (keys.length === 0) return null;

  return (
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
            const labelled = tFields.has(key as never);
            const from = render(before, key);
            const to = render(after, key);
            const changed = from.text !== to.text;

            return (
              <tr key={key}>
                <th
                  scope="row"
                  className={
                    labelled
                      ? 'py-2 text-start font-normal text-fg-secondary'
                      : 'py-2 text-start font-mono text-caption font-normal text-fg-secondary'
                  }
                >
                  {labelled ? tFields(key as never) : key}
                </th>

                <td
                  className={
                    from.raw ? 'py-2 font-mono text-caption text-fg-subtle' : 'py-2 text-fg-subtle'
                  }
                >
                  {from.text === '' ? '—' : from.text}
                </td>

                {/* Only the new value is emphasised; the old one is context,
                    not news. */}
                <td
                  className={[
                    'py-2',
                    changed ? 'font-medium text-fg' : 'text-fg-subtle',
                    to.raw ? 'font-mono text-caption' : '',
                  ]
                    .filter(Boolean)
                    .join(' ')}
                >
                  {to.text === '' ? '—' : to.text}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </section>
  );
}
