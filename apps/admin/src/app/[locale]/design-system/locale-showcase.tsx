'use client';

import { useFormatter, useLocale, useTranslations } from 'next-intl';
import type { ReactNode } from 'react';
import { LOCALES, LOCALE_CODES, type Locale } from '@afaq/types';
import { Badge, Card, Divider, Pagination, SectionHeader } from '@afaq/ui';
import {
  formatCompactCurrency,
  formatCurrency,
  formatDate,
  formatPercent,
  formatRelativeTime,
} from '@afaq/utils';
import { LanguageSwitcher } from '@/components/language-switcher';
import { usePaginationLabels } from '@/lib/i18n/use-component-labels';
import { ShowcaseSection } from './showcase-section';

// Fixed points in time: "now" differs between the server and the browser, and
// a moving sample would make the two disagree on the text.
const SAMPLE_DATE = '2026-03-15T09:30:00Z';
const RELATIVE_FROM = '2026-03-12T09:30:00Z';

function Row({ label, values }: { label: string; values: string[] }): ReactNode {
  return (
    <div className="grid grid-cols-3 gap-3 border-b border-border-subtle py-2 last:border-0">
      <span className="font-mono text-caption text-fg-muted">{label}</span>
      {values.map((value, index) => (
        <span key={index} className="text-body-small text-fg" dir="ltr">
          {value}
        </span>
      ))}
    </div>
  );
}

export function LocaleShowcase(): ReactNode {
  const t = useTranslations('nav');
  const tc = useTranslations('common');
  const locale = useLocale() as Locale;
  const formatter = useFormatter();
  const paginationLabels = usePaginationLabels();

  return (
    <ShowcaseSection title="Language">
      <div className="space-y-4">
        <Card className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-2 text-body-small text-fg-secondary">
            <span>{tc('language')}:</span>
            <Badge variant="primary" data-testid="current-locale">
              {LOCALES[locale].nativeLabel} ({locale})
            </Badge>
            <Badge variant="neutral" data-testid="current-dir">
              {LOCALES[locale].dir === 'rtl' ? 'right to left' : 'left to right'}
            </Badge>
          </div>
          <div className="flex items-center gap-3">
            <LanguageSwitcher variant="full" />
            <LanguageSwitcher />
          </div>
        </Card>

        <Card>
          <SectionHeader
            as="h3"
            title="Same page, both languages"
            description="Switching keeps you on this page and remembers the choice for next time."
          />
          <div className="mt-4 grid grid-cols-2 gap-x-6 gap-y-2 sm:grid-cols-3">
            {(
              ['dashboard', 'investors', 'finance', 'compliance', 'reports', 'settings'] as const
            ).map((key) => (
              <div key={key} className="flex justify-between gap-3 text-body-small">
                <span className="font-mono text-caption text-fg-muted">nav.{key}</span>
                <span className="text-fg">{t(key)}</span>
              </div>
            ))}
          </div>
        </Card>

        <Card>
          <SectionHeader
            as="h3"
            title="Numbers, money and dates"
            description="Both languages use Western digits, so financial figures stay comparable and line up in tables."
          />
          <div className="mt-4">
            <div className="grid grid-cols-3 gap-3 pb-2 text-caption text-fg-muted">
              <span>helper</span>
              {LOCALE_CODES.map((code) => (
                <span key={code}>{LOCALES[code].label}</span>
              ))}
            </div>
            <Row
              label="formatCurrency"
              values={LOCALE_CODES.map((code) => formatCurrency(1250000.5, { locale: code }))}
            />
            <Row
              label="formatCompactCurrency"
              values={LOCALE_CODES.map((code) => formatCompactCurrency(48250000, { locale: code }))}
            />
            <Row
              label="formatPercent"
              values={LOCALE_CODES.map((code) => formatPercent(0.145, { locale: code }))}
            />
            <Row
              label="formatDate"
              values={LOCALE_CODES.map((code) => formatDate(SAMPLE_DATE, { locale: code }))}
            />
            <Row
              label="formatRelativeTime"
              values={LOCALE_CODES.map((code) =>
                formatRelativeTime(RELATIVE_FROM, {
                  locale: code,
                  now: new Date(SAMPLE_DATE),
                }),
              )}
            />
            <Divider className="my-4" label="next-intl formatter (current language)" />
            <p className="text-body-small text-fg-secondary" data-testid="intl-format">
              {formatter.dateTime(new Date(SAMPLE_DATE), { dateStyle: 'full' })} ·{' '}
              <span dir="ltr">{formatter.number(1250000.5, { maximumFractionDigits: 2 })}</span>
            </p>
          </div>
        </Card>

        <Card>
          <SectionHeader
            as="h3"
            title="Shared components follow the language"
            description="@afaq/ui ships English defaults; the app passes translated labels in."
          />
          <Pagination
            className="mt-4"
            page={3}
            pageCount={25}
            onPageChange={() => undefined}
            totalItems={245}
            pageSize={10}
            labels={paginationLabels}
          />
        </Card>
      </div>
    </ShowcaseSection>
  );
}
