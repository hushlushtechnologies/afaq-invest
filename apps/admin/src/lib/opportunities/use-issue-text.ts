'use client';

import { useLocale, useTranslations } from 'next-intl';
import type { Locale, OpportunityIssue } from '@afaq/types';
import { formatCurrency } from '@afaq/utils';

/**
 * Puts a validation issue into words, in the reader's language.
 *
 * The issue carries a code and raw numbers; the sentence lives in the message
 * files under `opportunities.issues.<code>`. Every number an issue carries is
 * an amount of money, so each is formatted as currency here — once, in the
 * reader's locale — before it reaches the sentence. The message files then
 * only ever place a ready-made string, which keeps Arabic digits and the
 * currency code where Arabic puts them.
 *
 * The API's English `message` is never shown: it is for developers reading a
 * raw response, not for the person filling in the form.
 */
export function useOpportunityIssueText(currency: string): (issue: OpportunityIssue) => string {
  const t = useTranslations('opportunities.issues');
  const locale = useLocale() as Locale;

  return (issue) => {
    const values: Record<string, string> = {};

    for (const [key, value] of Object.entries(issue.values ?? {})) {
      values[key] =
        typeof value === 'number'
          ? formatCurrency(value, { locale, currency, whole: true })
          : value;
    }

    return t(issue.code, values);
  };
}
