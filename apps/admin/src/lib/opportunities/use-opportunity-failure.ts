'use client';

import { ApiRequestError } from '@afaq/api-client';
import { useTranslations } from 'next-intl';
import {
  OPPORTUNITY_ISSUE_CODES,
  type OpportunityIssue,
  type OpportunityIssueCode,
} from '@afaq/types';
import { useOpportunityIssueText } from './use-issue-text';

const ISSUE_CODES = new Set<string>(OPPORTUNITY_ISSUE_CODES);

/** What went wrong, worded for the person who pressed the button. */
export interface OpportunityFailure {
  message: string;
  /** Each validation problem the API listed, already translated. */
  issues: string[];
}

/**
 * The issues a refusal carried, if it carried any that this build knows.
 *
 * The body is whatever the server sent, so each entry is checked rather than
 * cast: an unknown code is dropped instead of being looked up and printed as
 * a dotted message key.
 */
function readIssues(details: Readonly<Record<string, unknown>> | undefined): OpportunityIssue[] {
  const raw = details?.issues;
  if (!Array.isArray(raw)) return [];

  const issues: OpportunityIssue[] = [];

  for (const entry of raw) {
    if (typeof entry !== 'object' || entry === null) continue;
    const { code, values, message } = entry as Record<string, unknown>;
    if (typeof code !== 'string' || !ISSUE_CODES.has(code)) continue;

    const clean: Record<string, number | string> = {};
    if (typeof values === 'object' && values !== null) {
      for (const [key, value] of Object.entries(values as Record<string, unknown>)) {
        if (typeof value === 'number' || typeof value === 'string') clean[key] = value;
      }
    }

    issues.push({
      code: code as OpportunityIssueCode,
      message: typeof message === 'string' ? message : '',
      values: clean,
    });
  }

  return issues;
}

/**
 * Turns whatever a write threw into words, in the reader's language.
 *
 * The API's own messages are English and written for developers. Every
 * reason it can give is translated under `opportunities.errors` instead; only
 * a refusal this build has never heard of falls back to the API's text, which
 * is still better than a generic "something went wrong".
 */
export function useOpportunityFailure(
  currency: string,
): (error: unknown) => OpportunityFailure | null {
  const t = useTranslations('opportunities.errors');
  const issueText = useOpportunityIssueText(currency);

  return (error) => {
    if (!error) return null;

    if (!(error instanceof ApiRequestError)) return { message: t('failed'), issues: [] };

    if (error.statusCode === 403) return { message: t('forbidden'), issues: [] };

    // Looked up by the reason itself rather than through a list kept here:
    // the message files are the list, and
    // apps/api/src/opportunities/opportunity-issue-messages.spec.ts fails if a
    // reason the API can throw is missing from them. `t.has` covers a server
    // newer than this build.
    if (error.reason && t.has(error.reason as never)) {
      return {
        message: t(error.reason as never),
        issues: readIssues(error.details).map(issueText),
      };
    }

    return { message: error.message || t('failed'), issues: [] };
  };
}
