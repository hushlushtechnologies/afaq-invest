import { BadRequestException, ConflictException } from '@nestjs/common';
import {
  annualisedBasisPoints,
  annualisedRoi,
  PAYOUTS_PER_YEAR,
  type InvestmentQuote,
  type LadderIssue,
  type ResolvedInvestmentTerms,
  type RuleSetScope,
  type RuleSetStatus,
} from '@afaq/types';

/**
 * The rules about investment rule sets, as plain functions.
 *
 * Kept out of the services so each can be read on its own and tested without a
 * database. The services decide when to ask; these decide the answer.
 */

/** What `scopeKey` holds for a platform-wide ladder. */
export const GLOBAL_SCOPE_KEY = 'GLOBAL';

// ===========================================================================
// SCOPE
// ===========================================================================

/**
 * Refuses a scope that does not match its company.
 *
 * A GLOBAL ladder with a company attached, or a COMPANY ladder without one,
 * would both store a `scopeKey` that means nothing — and the unique indexes
 * that guarantee one live ladder per scope would guard the wrong thing.
 */
export function assertScopeIsCoherent(scope: RuleSetScope, companyId: string | null): void {
  if (scope === 'COMPANY' && !companyId) {
    throw new BadRequestException({
      reason: 'company_required',
      field: 'companyId',
      message: 'A company-specific ladder needs a company.',
    });
  }

  if (scope === 'GLOBAL' && companyId) {
    throw new BadRequestException({
      reason: 'company_not_allowed',
      field: 'companyId',
      message: 'A platform-wide ladder applies to every company, so it cannot name one.',
    });
  }
}

/**
 * The value stored in `scopeKey`, and in `activeKey` while the set is live.
 *
 * Derived rather than entered, so the two columns can never disagree with the
 * scope they describe.
 */
export function scopeKeyFor(scope: RuleSetScope, companyId: string | null): string {
  assertScopeIsCoherent(scope, companyId);

  return scope === 'GLOBAL' ? GLOBAL_SCOPE_KEY : (companyId as string);
}

// ===========================================================================
// LIFECYCLE
// ===========================================================================

/**
 * Refuses to change anything but a draft.
 *
 * The whole point of versioning: a live ladder is what investors are being
 * sold right now, and an archived one is the record of what somebody was sold
 * in the past. Editing either would rewrite history rather than change the
 * future. Changing the rules means publishing a new version.
 */
export function assertEditable(status: RuleSetStatus): void {
  if (status === 'DRAFT') return;

  throw new ConflictException({
    reason: status === 'ACTIVE' ? 'rule_set_live' : 'rule_set_archived',
    status,
    message:
      status === 'ACTIVE'
        ? 'This ladder is live and cannot be edited. Create a new version from it instead.'
        : 'This ladder is archived. It is the record of what investors were sold, so it ' +
          'cannot be changed.',
  });
}

/** Only a draft can be published. */
export function assertPublishable(status: RuleSetStatus): void {
  if (status === 'DRAFT') return;

  throw new ConflictException({
    reason: status === 'ACTIVE' ? 'already_live' : 'rule_set_archived',
    status,
    message:
      status === 'ACTIVE'
        ? 'This ladder is already live.'
        : 'An archived ladder cannot be published again. Create a new version from it.',
  });
}

/** Only the live ladder can be archived, and doing so leaves nothing live. */
export function assertArchivable(status: RuleSetStatus): void {
  if (status === 'ACTIVE') return;

  throw new ConflictException({
    reason: status === 'DRAFT' ? 'not_live' : 'already_archived',
    status,
    message:
      status === 'DRAFT'
        ? 'This ladder was never published, so there is nothing to archive. Delete it instead.'
        : 'This ladder is already archived.',
  });
}

/**
 * Only a draft can be deleted.
 *
 * Deleting an archived set would destroy the evidence of what an existing
 * investor was sold, which is the one thing this model exists to preserve.
 */
export function assertDeletable(status: RuleSetStatus): void {
  if (status === 'DRAFT') return;

  throw new ConflictException({
    reason: status === 'ACTIVE' ? 'rule_set_live' : 'rule_set_archived',
    status,
    message:
      status === 'ACTIVE'
        ? 'Archive this ladder before deleting it — investors are being sold it right now.'
        : 'An archived ladder is the record of what investors were sold and is never deleted.',
  });
}

// ===========================================================================
// LADDER VALIDATION, AS A REFUSAL
// ===========================================================================

/**
 * Turns the shared validator's findings into one refusal.
 *
 * `validateTierLadder` returns every problem rather than the first, and so
 * does this: the Admin form highlights all of them at once, and somebody
 * fixing a ladder by hand through the API gets the same courtesy.
 */
export function ladderRejection(issues: readonly LadderIssue[]): BadRequestException {
  return new BadRequestException({
    reason: 'invalid_ladder',
    message:
      issues.length === 1
        ? issues[0]?.message
        : `That ladder has ${issues.length} problems. See "issues" for each one.`,
    issues,
  });
}

// ===========================================================================
// WHAT AN AMOUNT EARNS
// ===========================================================================

/** One AED, in fils. All money arithmetic happens in these. */
const FILS = 100;

/** Percent to basis points, matching `annualisedBasisPoints`. */
const BP_PER_PERCENT = 100;

/**
 * Turns an amount and its resolved terms into figures.
 *
 * Every step is integer arithmetic on fils, because `0.1 + 0.2 !== 0.3` and
 * these numbers are what the business pays people. Rounding is half-up, at the
 * fils, once per figure — and the figures are independent: a year's return is
 * not twelve rounded monthly payments added up, so the two can differ by a
 * fils or two. Reconciling that difference at payout time belongs to the
 * distributions phase, not here.
 *
 * The rate's basis and the payout frequency are allowed to differ — 10% a year
 * paid monthly is an ordinary product — so everything is put on a yearly
 * footing first and then divided by the number of payouts.
 */
export function computeQuote(
  amount: number,
  terms: ResolvedInvestmentTerms,
  currency: string,
  termMonths: number | null,
): InvestmentQuote {
  const amountFils = Math.round(amount * FILS);
  const yearlyBasisPoints = annualisedBasisPoints(terms.roiPercent, terms.roiBasis);

  // amount × percent / 100, with percent held as basis points: one rounding.
  const returnPerYearFils = Math.round((amountFils * yearlyBasisPoints) / (BP_PER_PERCENT * 100));

  const payoutsPerYear = PAYOUTS_PER_YEAR[terms.payoutFrequency];

  const returnPerPayoutFils =
    payoutsPerYear === null ? null : Math.round(returnPerYearFils / payoutsPerYear);

  const totalOverTermFils =
    termMonths === null ? null : Math.round((returnPerYearFils * termMonths) / 12);

  return {
    amount,
    currency,
    terms,
    returnPerPayout: returnPerPayoutFils === null ? null : returnPerPayoutFils / FILS,
    payoutsPerYear,
    returnPerYear: returnPerYearFils / FILS,
    termMonths,
    totalReturnOverTerm: totalOverTermFils === null ? null : totalOverTermFils / FILS,
  };
}

/**
 * Refuses a term the chosen option does not offer.
 *
 * Checked here rather than left to the caller because a term outside the
 * option's range is a different product from the one whose rate is being
 * quoted, and quoting it would be quietly wrong.
 */
export function assertTermIsOffered(
  termMonths: number | null,
  terms: ResolvedInvestmentTerms,
): void {
  if (termMonths === null) {
    if (terms.minTermMonths === null) return;

    throw new BadRequestException({
      reason: 'term_required',
      field: 'termMonths',
      message: `A locked investment needs a term of ${terms.minTermMonths} months or more.`,
    });
  }

  if (terms.minTermMonths !== null && termMonths < terms.minTermMonths) {
    throw new BadRequestException({
      reason: 'term_too_short',
      field: 'termMonths',
      message: `The shortest term for this tier is ${terms.minTermMonths} months.`,
    });
  }

  if (terms.maxTermMonths !== null && termMonths > terms.maxTermMonths) {
    throw new BadRequestException({
      reason: 'term_too_long',
      field: 'termMonths',
      message: `The longest term for this tier is ${terms.maxTermMonths} months.`,
    });
  }
}

/** Refuses an amount the ladder does not reach. */
export function belowMinimum(
  amount: number,
  minimum: number,
  currency: string,
): BadRequestException {
  return new BadRequestException({
    reason: 'below_minimum',
    field: 'amount',
    minimum,
    message: `The smallest investment is ${currency} ${minimum.toLocaleString('en-US')}.`,
  });
}

/** Turns a rate into its yearly equivalent, for the resolved terms. */
export function yearlyRate(roiPercent: number, basis: ResolvedInvestmentTerms['roiBasis']): number {
  return annualisedRoi(roiPercent, basis);
}
