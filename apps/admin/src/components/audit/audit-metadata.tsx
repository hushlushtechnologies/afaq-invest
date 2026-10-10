'use client';

import { useLocale, useTranslations } from 'next-intl';
import type { ReactNode } from 'react';
import type { Locale } from '@afaq/types';
import { formatNumber } from '@afaq/utils';

/**
 * The extra detail an entry carries, in words.
 *
 * Metadata is where the API puts the things that are not a before-and-after:
 * why somebody did it, whether they re-entered their password, which rule set
 * a draft was copied from. It was a JSON dump — which meant the most
 * important line in a security entry, `"stepUp": "own_password"`, was shown
 * to the reader as `"stepUp": "own_password"`.
 *
 * The values are a small fixed vocabulary written by the API, so they get
 * translated where the before-and-after values deliberately do not: nobody
 * stored the string `own_password` as a business fact, it is this system
 * talking to itself.
 */

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/** Free text an administrator typed, which deserves its own block, not a cell. */
const PROSE_KEYS = ['reason'];

export function AuditMetadata({ metadata }: { metadata: unknown }): ReactNode {
  const t = useTranslations('audit.detail');
  const tMeta = useTranslations('audit.metadata');
  const tValues = useTranslations('audit.metadata.values');
  const locale = useLocale() as Locale;

  if (!isRecord(metadata)) return null;

  const entries = Object.entries(metadata).filter(([, value]) => value !== null);

  if (entries.length === 0) return null;

  function label(key: string): { text: string; labelled: boolean } {
    return tMeta.has(key as never)
      ? { text: tMeta(key as never), labelled: true }
      : { text: key, labelled: false };
  }

  function value(raw: unknown): string {
    if (typeof raw === 'boolean') return raw ? tMeta('yes') : tMeta('no');
    if (typeof raw === 'number') return formatNumber(raw, { locale });

    if (typeof raw === 'string') {
      // Known vocabulary gets the sentence; anything else — an identifier, a
      // slug, text somebody typed — is shown as stored.
      return tValues.has(raw as never) ? tValues(raw as never) : raw;
    }

    return JSON.stringify(raw);
  }

  const prose = entries.filter(([key]) => PROSE_KEYS.includes(key));
  const facts = entries.filter(([key]) => !PROSE_KEYS.includes(key));

  return (
    <section className="space-y-3">
      <h3 className="text-label font-medium text-fg">{t('metadata')}</h3>

      {prose.map(([key, raw]) => {
        const name = label(key);

        return (
          <div key={key} className="space-y-1">
            <p className="text-caption text-fg-muted">{name.text}</p>
            {/* Quoted and set apart, because this is the one part of an entry
                a person wrote in their own words rather than the system
                recording a value. */}
            <blockquote className="bg-surface-subtle rounded-e-lg border-s-2 border-border-strong py-2 ps-3 pe-3 text-body-small text-fg-secondary">
              {String(raw)}
            </blockquote>
          </div>
        );
      })}

      {facts.length === 0 ? null : (
        <dl className="grid gap-3 sm:grid-cols-2">
          {facts.map(([key, raw]) => {
            const name = label(key);

            return (
              <div key={key} className="space-y-0.5">
                <dt
                  className={
                    name.labelled
                      ? 'text-caption text-fg-muted'
                      : 'font-mono text-caption text-fg-muted'
                  }
                >
                  {name.text}
                </dt>
                <dd className="text-body-small text-fg">{value(raw)}</dd>
              </div>
            );
          })}
        </dl>
      )}
    </section>
  );
}
