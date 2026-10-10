import { readdirSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import {
  OPPORTUNITY_ISSUE_CODES,
  validateOpportunity,
  type OpportunityContext,
  type OpportunityIssue,
  type OpportunityIssueCode,
} from '@afaq/types';

/**
 * The Admin Portal puts every validation issue into words by looking up
 * `opportunities.issues.<code>` and filling in the issue's `values`.
 *
 * That lookup is built at runtime from the code, so neither next-intl's key
 * checking nor the placeholder script can see it. This closes the gap: every
 * code has a sentence in both languages, and no sentence asks for a value the
 * issue does not carry — which would print a literal `{minimum}` to the
 * person filling in the form.
 *
 * It reads the admin app's message files from an API test for the same
 * reason the audit-action test does: the codes are produced here, so this is
 * where a new one is added, and this is where forgetting its words should
 * fail.
 */

const API_SRC = join(dirname(fileURLToPath(import.meta.url)), '..');
const MESSAGES = join(API_SRC, '..', '..', '..', 'apps', 'admin', 'messages');

function opportunityMessages(
  locale: 'en' | 'ar',
  block: 'issues' | 'errors',
): Record<string, unknown> {
  const file = JSON.parse(readFileSync(join(MESSAGES, `${locale}.json`), 'utf8')) as {
    opportunities?: Partial<Record<'issues' | 'errors', Record<string, unknown>>>;
  };
  return file.opportunities?.[block] ?? {};
}

function issueMessages(locale: 'en' | 'ar'): Record<string, unknown> {
  return opportunityMessages(locale, 'issues');
}

/**
 * Every `reason: '…'` the opportunities API can refuse with, read from its
 * source rather than listed by hand — so adding a refusal and forgetting its
 * words fails here, not in front of somebody using the Arabic interface.
 */
function refusalReasons(): string[] {
  const dir = dirname(fileURLToPath(import.meta.url));
  const reasons = new Set<string>();

  for (const name of readdirSync(dir)) {
    if (!name.endsWith('.ts') || name.endsWith('.spec.ts')) continue;
    const source = readFileSync(join(dir, name), 'utf8');
    for (const match of source.matchAll(/\breason:\s*'([a-z_]+)'/g)) reasons.add(match[1]!);
  }

  return [...reasons].sort();
}

/** The simple `{name}` placeholders in a message, ignoring plural/select bodies. */
function placeholders(message: string): string[] {
  return [...message.matchAll(/\{\s*([A-Za-z_][\w]*)\s*(?:[,}])/g)].map((match) => match[1]!);
}

const NOW = new Date('2026-06-01T08:00:00.000Z');

function context(overrides: Partial<OpportunityContext> = {}): OpportunityContext {
  return {
    minimumInvestment: 10_000,
    currentStatus: null,
    committedAmount: 0,
    previousTarget: null,
    companyAcceptsInvestment: true,
    hasLiveLadder: true,
    opensAt: null,
    now: NOW,
    ...overrides,
  };
}

/**
 * Drafts that between them produce every issue code, so the test exercises
 * the real `values` each one carries rather than a list typed out by hand.
 */
function everyIssue(): OpportunityIssue[] {
  return [
    // no_title, no_company, target_not_positive
    ...validateOpportunity(
      { companyId: '', title: '', targetAmount: 0, closesAt: null },
      context(),
    ),
    // target_below_minimum
    ...validateOpportunity(
      { companyId: 'c', title: 'T', targetAmount: 5_000, closesAt: null },
      context(),
    ),
    // target_lowered, target_below_committed
    ...validateOpportunity(
      { companyId: 'c', title: 'T', targetAmount: 20_000, closesAt: null },
      context({ currentStatus: 'OPEN', previousTarget: 100_000, committedAmount: 50_000 }),
    ),
    // close_before_open, close_in_past, no_live_ladder, company_not_accepting
    ...validateOpportunity(
      { companyId: 'c', title: 'T', targetAmount: 50_000, closesAt: '2026-01-01T00:00:00.000Z' },
      context({
        opensAt: new Date('2026-02-01T00:00:00.000Z'),
        hasLiveLadder: false,
        companyAcceptsInvestment: false,
      }),
      { opening: true },
    ),
  ];
}

describe('opportunity issue messages', () => {
  const issues = everyIssue();

  it('the fixture reaches every issue code', () => {
    const reached = new Set(issues.map((issue) => issue.code));
    expect([...reached].sort()).toEqual([...OPPORTUNITY_ISSUE_CODES].sort());
  });

  for (const locale of ['en', 'ar'] as const) {
    const messages = issueMessages(locale);

    it(`${locale}: every code has a sentence`, () => {
      const missing = OPPORTUNITY_ISSUE_CODES.filter(
        (code) => typeof messages[code] !== 'string' || (messages[code] as string).trim() === '',
      );
      expect(missing).toEqual([]);
    });

    it(`${locale}: no sentence for a code that does not exist`, () => {
      const known = new Set<string>(OPPORTUNITY_ISSUE_CODES);
      expect(Object.keys(messages).filter((key) => !known.has(key))).toEqual([]);
    });

    it(`${locale}: every placeholder is a value the issue carries`, () => {
      const problems: string[] = [];

      for (const issue of issues) {
        const message = messages[issue.code as OpportunityIssueCode];
        if (typeof message !== 'string') continue;

        const carried = new Set(Object.keys(issue.values ?? {}));
        for (const name of placeholders(message)) {
          if (!carried.has(name)) problems.push(`${issue.code} uses {${name}}`);
        }
      }

      expect(problems).toEqual([]);
    });
  }
});

describe('opportunity refusal messages', () => {
  const reasons = refusalReasons();

  it('finds the refusals in the API source', () => {
    // A guard on the scan itself: if the pattern stopped matching, every
    // check below would pass vacuously.
    expect(reasons).toEqual(
      expect.arrayContaining(['changed_meanwhile', 'invalid_opportunity', 'invalid_transition']),
    );
  });

  for (const locale of ['en', 'ar'] as const) {
    it(`${locale}: every refusal the API can give has a sentence`, () => {
      const messages = opportunityMessages(locale, 'errors');
      const missing = reasons.filter(
        (reason) => typeof messages[reason] !== 'string' || (messages[reason] as string) === '',
      );
      expect(missing).toEqual([]);
    });
  }
});
