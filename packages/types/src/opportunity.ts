/**

 * Investment opportunities, as every side of the platform sees them.

 *

 * An opportunity is the thing an investor actually puts money into. A company

 * says who is raising; a rule set says on what terms; an opportunity says

 * *this raise, for this much, until then* — and it is the only one of the

 * three that has a target, a window, and a point at which it stops.

 *

 * Four decisions are baked into this file, because they are expensive to

 * reverse and quietly change what the platform promises:

 *

 * 1. A company may run several opportunities at once. Each has its own

 *    target and window, so a developer raising for two buildings is two

 *    raises, not one blurred together.

 *

 * 2. The terms are pinned when the opportunity opens. It stores the exact

 *    rule-set version it was opened under, so republishing the ladder changes

 *    what the *next* raise offers and never what this one already advertised.

 *    This is the same reasoning that makes a live ladder immutable.

 *

 * 3. The target is a hard cap. Once committed funds reach it the opportunity

 *    stops accepting money. Taking more than the raise was for is not a thing

 *    the software should allow by omission.

 *

 * 4. Opening one needs no password step-up. The rates were gated when the

 *    ladder was published; opening only decides when that already-priced

 *    offer becomes visible.

 *

 * The string values match the Prisma enums exactly, and this file depends only

 * on the other type modules, so the seed can import it before the API exists.

 */

import {
  acceptsInvestment,
  type CompanyStatus,
  type CompanyType,
  type CompanyVerification,
} from './company';

import type { InvestmentMode, RoiBasis, RuleSetScope } from './investment';

/* -------------------------------------------------------------------------- */

/* Status                                                                     */

/* -------------------------------------------------------------------------- */

/**

 * Where an opportunity is in its life.

 *

 * Six states rather than a boolean, because each answers a question an

 * investor or an auditor will actually ask, and collapsing any two of them

 * loses a fact somebody needs:

 *

 * - DRAFT         being written. Invisible outside the Admin Portal.

 * - OPEN          visible and accepting money.

 * - SUSPENDED     temporarily halted. Still visible, not accepting.

 * - FULLY_FUNDED  the target was reached. Not accepting, and that is a

 *                 success — distinct from having been stopped.

 * - CLOSED        finished. Either closed by hand or past its closing date.

 * - CANCELLED     withdrawn. It never completed, and saying so is different

 *                 from saying it closed.

 */

export const OPPORTUNITY_STATUSES = [
  'DRAFT',

  'OPEN',

  'SUSPENDED',

  'FULLY_FUNDED',

  'CLOSED',

  'CANCELLED',
] as const;

export type OpportunityStatus = (typeof OPPORTUNITY_STATUSES)[number];

/**
 * Actions supported by the Opportunities API lifecycle endpoints.
 *
 * These lowercase values are used in URLs such as:
 * POST /opportunities/:id/open
 * POST /opportunities/:id/suspend
 *
 * Keep them in sync with the API's opportunity-policy action names.
 */
export const OPPORTUNITY_MOVES = ['open', 'suspend', 'resume', 'close', 'cancel'] as const;

export type OpportunityMove = (typeof OPPORTUNITY_MOVES)[number];

/**
 * Suspending or cancelling a raise requires a reason for the audit trail.
 * Other lifecycle actions may carry an optional note.
 *
 * Typed as readonly OpportunityMove[] so `.includes(move)` accepts every
 * OpportunityMove without casts in the Admin dialog.
 */
export const OPPORTUNITY_MOVES_NEEDING_REASON: readonly OpportunityMove[] = ['suspend', 'cancel'];

/**
 * Client-side length limits for lifecycle reasons/notes.
 * Keep these synchronized with the API DTO's validation decorators.
 */
export const MIN_MOVE_REASON_LENGTH = 10;
export const MAX_MOVE_REASON_LENGTH = 500;

/**

 * Which status may follow which.

 *

 * Written out rather than left to each endpoint to decide, because the

 * interesting cases are the ones nobody thinks to check: reopening something

 * that was cancelled, "un-funding" a completed raise, editing a closed one

 * back into a draft. All of those are absent here, which is the point.

 *

 * CLOSED and CANCELLED are terminal. A raise that needs to happen again is a

 * new opportunity, for the same reason a changed ladder is a new version:

 * there has to be a record of what the first one was.

 */

export const OPPORTUNITY_STATUS_TRANSITIONS: Record<
  OpportunityStatus,
  readonly OpportunityStatus[]
> = {
  DRAFT: ['OPEN', 'CANCELLED'],

  OPEN: ['SUSPENDED', 'FULLY_FUNDED', 'CLOSED', 'CANCELLED'],

  SUSPENDED: ['OPEN', 'CLOSED', 'CANCELLED'],

  // Closing is the only way on: the money is in, and what remains is to

  // finish the raise.

  FULLY_FUNDED: ['CLOSED'],

  CLOSED: [],

  CANCELLED: [],
};

/**
 * The actions available from a status, based on the existing transition table.
 *
 * There are two ways into OPEN: draft -> open and suspended -> resume.
 * FULLY_FUNDED is an automatic transition, not a manual action.
 */
export function availableMoves(status: OpportunityStatus): OpportunityMove[] {
  const moves: OpportunityMove[] = [];
  for (const target of OPPORTUNITY_STATUS_TRANSITIONS[status]) {
    switch (target) {
      case 'OPEN':
        moves.push(status === 'DRAFT' ? 'open' : 'resume');
        break;
      case 'SUSPENDED':
        moves.push('suspend');
        break;
      case 'CLOSED':
        moves.push('close');
        break;
      case 'CANCELLED':
        moves.push('cancel');
        break;
      case 'FULLY_FUNDED':
      case 'DRAFT':
        // Reaching the funding cap is automatic; no lifecycle action is offered.
        break;
    }
  }
  return moves;
}

export function canTransition(from: OpportunityStatus, to: OpportunityStatus): boolean {
  return OPPORTUNITY_STATUS_TRANSITIONS[from].includes(to);
}

/** Statuses that are over, so the Admin list can separate past from present. */

export function isFinished(status: OpportunityStatus): boolean {
  return status === 'CLOSED' || status === 'CANCELLED';
}

/* -------------------------------------------------------------------------- */

/* What may be changed, and when                                              */

/* -------------------------------------------------------------------------- */

/**

 * The fields that describe a raise without changing its terms.

 *

 * These stay editable after opening. Fixing a typo in a description, adding a

 * cover image or extending a closing date are all things that happen to a

 * live raise, and refusing them would mean cancelling and re-creating it.

 */

export const OPPORTUNITY_NARRATIVE_FIELDS = [
  'title',

  'summary',

  'description',

  'coverImageUrl',

  'closesAt',

  'isFeatured',

  'displayOrder',
] as const;

/**

 * The fields that *are* the offer.

 *

 * Locked once the opportunity opens, with one exception handled in

 * `validateOpportunity` below: the target may be raised, never lowered. A

 * successful raise being extended is ordinary business; shrinking the target

 * people decided against changes the scarcity they were shown, and shrinking

 * it below money already committed is simply incoherent.

 *

 * The pinned rule set is not here at all, because it is not editable in any

 * status — it is set once, by opening, and that is the whole point of it.

 */

export const OPPORTUNITY_TERMS_FIELDS = ['companyId', 'targetAmount'] as const;

export function termsAreLocked(status: OpportunityStatus): boolean {
  return status !== 'DRAFT';
}

/* -------------------------------------------------------------------------- */

/* Whether money may arrive                                                   */

/* -------------------------------------------------------------------------- */

/** Why an opportunity is not taking money, when it is not. */

export const OPPORTUNITY_CLOSED_REASONS = [
  'company_unavailable',

  'not_open',

  'window_passed',

  'fully_funded',
] as const;

export type OpportunityClosedReason = (typeof OPPORTUNITY_CLOSED_REASONS)[number];

export type InvestmentAvailability =
  { open: true } | { open: false; reason: OpportunityClosedReason };

/**

 * The one predicate that decides whether an investment may be accepted.

 *

 * A reason rather than a bare false, because "this raise is full" and "this

 * raise was withdrawn" are different things to tell somebody holding their

 * money, and a boolean forces the caller to guess which.

 *

 * Checked in this order deliberately. The company comes first: a suspended

 * company's opportunities are unavailable however healthy they look, and

 * saying "fully funded" about a raise nobody may enter would be a lie of

 * emphasis. `acceptsInvestment` in ./company is the floor this sits on.

 */

export function investmentAvailability(
  opportunity: {
    status: OpportunityStatus;

    closesAt: Date | string | null;

    committedAmount: number;

    targetAmount: number;
  },

  company: { status: CompanyStatus; type: CompanyType; verification: CompanyVerification },

  now: Date = new Date(),
): InvestmentAvailability {
  if (!acceptsInvestment(company)) return { open: false, reason: 'company_unavailable' };

  if (opportunity.status !== 'OPEN') {
    return {
      open: false,

      reason: opportunity.status === 'FULLY_FUNDED' ? 'fully_funded' : 'not_open',
    };
  }

  // A closing date that has passed closes the raise whether or not anybody has

  // got round to pressing the button. The status is corrected by whoever

  // notices first; this predicate does not wait for them.

  if (opportunity.closesAt !== null && new Date(opportunity.closesAt).getTime() <= now.getTime()) {
    return { open: false, reason: 'window_passed' };
  }

  if (remainingCapacity(opportunity) <= 0) return { open: false, reason: 'fully_funded' };

  return { open: true };
}

/**

 * How much more this raise can take.

 *

 * Never negative. A raise that somehow holds more than its target is a

 * reconciliation problem, not a licence to report negative headroom at

 * somebody.

 */

export function remainingCapacity(opportunity: {
  committedAmount: number;

  targetAmount: number;
}): number {
  return Math.max(0, opportunity.targetAmount - opportunity.committedAmount);
}

/**

 * How full the raise is, 0–100.

 *

 * Clamped at both ends, and rounded for display only — never fed back into

 * arithmetic. A target of zero reads as 0%, not as a division by zero or as

 * "complete".

 */

export function fundingPercent(opportunity: {
  committedAmount: number;

  targetAmount: number;
}): number {
  if (opportunity.targetAmount <= 0) return 0;

  const ratio = (opportunity.committedAmount / opportunity.targetAmount) * 100;

  return Math.min(100, Math.max(0, Math.round(ratio)));
}

/** Days until the advertised close, or null when there is no closing date. */

export function daysRemaining(
  opportunity: { closesAt: Date | string | null },

  now: Date = new Date(),
): number | null {
  if (opportunity.closesAt === null) return null;

  const millis = new Date(opportunity.closesAt).getTime() - now.getTime();

  // Rounded up, so the last partial day still reads as "1 day left" rather

  // than as "0" on a raise that is still open.

  return Math.max(0, Math.ceil(millis / 86_400_000));
}

/* -------------------------------------------------------------------------- */

/* Shapes                                                                     */

/* -------------------------------------------------------------------------- */

/** The pinned terms, flattened for display beside the raise they priced. */

export interface OpportunityTerms {
  ruleSetId: string;

  ruleSetName: string;

  ruleSetVersion: number;

  scope: RuleSetScope;

  roiBasis: RoiBasis;

  /** The floor of the lowest tier: the least anybody may put in. */

  minimumInvestment: number;

  /** The best rate on offer, with the mode and the period that qualify it. */

  bestRoiPercent: number;

  bestRoiMode: InvestmentMode;
}

/** An opportunity as the Admin list and the marketplace grid show it. */

export interface OpportunityListItem {
  id: string;

  slug: string;

  title: string;

  summary: string | null;

  status: OpportunityStatus;

  companyId: string;

  companyName: string;

  companySlug: string;

  /** Afaq's own companies come first in the marketplace. */

  companyType: CompanyType;

  sector: string;

  coverImageUrl: string | null;

  targetAmount: number;

  committedAmount: number;

  /** Derived, but sent: every card shows it and no caller should re-derive it. */

  fundingPercent: number;

  opensAt: string | null;

  closesAt: string | null;

  isFeatured: boolean;

  displayOrder: number;

  updatedAt: string;
}

/** Everything on the opportunity detail page. */

export interface OpportunityDetail extends OpportunityListItem {
  description: string | null;

  /**

   * Null only while the opportunity is a draft. Everything from OPEN onwards

   * has terms, because pinning them is what opening does.

   */

  terms: OpportunityTerms | null;

  closedAt: string | null;

  createdByName: string | null;

  openedByName: string | null;

  createdAt: string;
}

/** The dashboard's counts. Only what exists is counted. */

export interface OpportunitySummary {
  total: number;

  open: number;

  draft: number;

  fullyFunded: number;

  /** Across open raises only — the figure "how much are we raising" means. */

  targetOpen: number;

  committedOpen: number;
}

export const OPPORTUNITY_SORT_FIELDS = [
  'displayOrder',

  'title',

  'targetAmount',

  'committedAmount',

  'closesAt',

  'updatedAt',
] as const;

export type OpportunitySortField = (typeof OPPORTUNITY_SORT_FIELDS)[number];

/** Filters and paging for the opportunity list. Every field optional. */

export interface OpportunityListQuery {
  page?: number;

  pageSize?: number;

  status?: OpportunityStatus;

  companyId?: string;

  sector?: string;

  companyType?: CompanyType;

  /** True for OPEN and SUSPENDED, false for the finished ones. */

  liveOnly?: boolean;

  search?: string;

  sortField?: OpportunitySortField;

  sortDirection?: 'asc' | 'desc';
}

/**

 * Creating or editing an opportunity.

 *

 * `slug`, `status` and the pinned rule set are all absent on purpose. The slug

 * is derived from the title once, by the API, because a slug that follows a

 * rename breaks every saved link. The status moves through its own audited

 * endpoints — letting it ride along inside an ordinary edit would mean

 * anybody who can fix a typo can also open a raise. And the rule set is

 * chosen by the platform at the moment of opening, not typed in by hand.

 */

export interface OpportunityInput {
  companyId: string;

  title: string;

  summary?: string | null;

  description?: string | null;

  coverImageUrl?: string | null;

  targetAmount: number;

  closesAt?: string | null;

  isFeatured?: boolean;

  displayOrder?: number;
}

/* -------------------------------------------------------------------------- */

/* Validation                                                                 */

/* -------------------------------------------------------------------------- */

/**

 * What can be wrong with an opportunity.

 *

 * Codes rather than sentences, for the same reason the tier ladder uses them:

 * the API refuses on these, the Admin editor shows them as you type, and both

 * have to agree about what is wrong. The words live in the message files,

 * once per language.

 */

export const OPPORTUNITY_ISSUE_CODES = [
  'no_title',

  'no_company',

  'target_not_positive',

  'target_below_minimum',

  'target_lowered',

  'target_below_committed',

  'close_before_open',

  'close_in_past',

  'no_live_ladder',

  'company_not_accepting',
] as const;

export type OpportunityIssueCode = (typeof OPPORTUNITY_ISSUE_CODES)[number];

export interface OpportunityIssue {
  code: OpportunityIssueCode;

  /** The form field to highlight. */

  field?: 'title' | 'companyId' | 'targetAmount' | 'closesAt';

  /**

   * English, for the API's own error text — the same convention as

   * LadderIssue. The portals translate the code instead, so this sentence is

   * what a developer reading a 400 response sees, not what an investor does.

   */

  message: string;

  /** Numbers the translated message interpolates, already in platform units. */

  values?: Record<string, number | string>;
}

/** What the draft is judged against. All of it is known to the caller. */

export interface OpportunityContext {
  /** From the platform settings: nobody may invest less than this. */

  minimumInvestment: number;

  /** Null when the opportunity does not exist yet. */

  currentStatus: OpportunityStatus | null;

  /** Zero until money arrives. */

  committedAmount: number;

  /** The stored target, so a lowering can be spotted. Null on create. */

  previousTarget: number | null;

  /** `acceptsInvestment(company)`, resolved by the caller. */

  companyAcceptsInvestment: boolean;

  /**

   * Whether a rule set is published for this company's scope — its own if it

   * has one, otherwise the platform-wide one. Without one there is nothing to

   * pin, so there is nothing to open.

   */

  hasLiveLadder: boolean;

  opensAt: Date | null;

  now: Date;
}

/**

 * Everything wrong with a draft, in one pass.

 *

 * All of it, not the first problem: somebody filling this in should see every

 * reason it will be refused rather than discovering them one save at a time.

 * An empty array means it is valid against this context.

 *

 * `opening` separates the two questions this answers. Saving a draft only has

 * to be coherent; opening it to investors has to be coherent *and* have

 * somewhere for the money to come from — a live ladder, a company that may

 * receive investment, and a closing date that has not already passed. Those

 * three are checked only when opening, so a half-finished draft is not

 * covered in errors about a decision nobody has made yet.

 */

/**
 * Opening checks whether a draft can become available to investors.
 * Live checks a running raise's closing date without applying opening-only
 * company and ladder requirements to ordinary edits.
 */
export interface OpportunityValidationOptions {
  opening?: boolean;
  live?: boolean;
}

export function validateOpportunity(
  draft: { companyId: string; title: string; targetAmount: number; closesAt: Date | string | null },

  context: OpportunityContext,

  { opening = false, live = false }: OpportunityValidationOptions = {},
): OpportunityIssue[] {
  const issues: OpportunityIssue[] = [];

  if (draft.title.trim() === '')
    issues.push({ code: 'no_title', field: 'title', message: 'Give the opportunity a title.' });

  if (draft.companyId.trim() === '')
    issues.push({
      code: 'no_company',

      field: 'companyId',

      message: 'Choose the company that is raising.',
    });

  // --- the target ----------------------------------------------------------

  if (!(draft.targetAmount > 0)) {
    issues.push({
      code: 'target_not_positive',

      field: 'targetAmount',

      message: 'The target must be more than zero.',
    });
  } else if (draft.targetAmount < context.minimumInvestment) {
    // A raise smaller than a single permitted investment cannot be filled by

    // anybody, which is a stranger failure to debug than it is to prevent.

    issues.push({
      code: 'target_below_minimum',

      field: 'targetAmount',

      message: `The target (${draft.targetAmount}) is below the minimum single investment (${context.minimumInvestment}), so nobody could fill it.`,

      values: { minimum: context.minimumInvestment, target: draft.targetAmount },
    });
  }

  if (
    context.previousTarget !== null &&
    context.currentStatus !== null &&
    termsAreLocked(context.currentStatus) &&
    draft.targetAmount < context.previousTarget
  ) {
    // Raising is allowed, lowering is not: see OPPORTUNITY_TERMS_FIELDS.

    issues.push({
      code: 'target_lowered',

      field: 'targetAmount',

      message: `The target of an opened raise can be raised but not lowered (from ${context.previousTarget} to ${draft.targetAmount}).`,

      values: { from: context.previousTarget, to: draft.targetAmount },
    });
  }

  if (draft.targetAmount > 0 && draft.targetAmount < context.committedAmount) {
    issues.push({
      code: 'target_below_committed',

      field: 'targetAmount',

      message: `The target (${draft.targetAmount}) is below what has already been committed (${context.committedAmount}).`,

      values: { committed: context.committedAmount, target: draft.targetAmount },
    });
  }

  // --- the window ----------------------------------------------------------

  if (draft.closesAt !== null) {
    const closes = new Date(draft.closesAt).getTime();

    const opens = context.opensAt?.getTime() ?? null;

    if (opens !== null && closes <= opens)
      issues.push({
        code: 'close_before_open',

        field: 'closesAt',

        message: 'The closing date must be after the opening date.',
      });

    if ((opening || live) && closes <= context.now.getTime())
      issues.push({
        code: 'close_in_past',

        field: 'closesAt',

        message: opening
          ? 'The closing date has already passed. Move it forward or clear it before opening.'
          : 'The closing date of a running opportunity must be in the future.',
      });
  }

  // --- only when opening ---------------------------------------------------

  if (opening) {
    if (!context.hasLiveLadder)
      issues.push({
        code: 'no_live_ladder',

        message:
          'No rule set is published for this company or platform-wide, so there are no terms to pin.',
      });

    if (!context.companyAcceptsInvestment)
      issues.push({
        code: 'company_not_accepting',

        field: 'companyId',

        message:
          'This company cannot receive investment right now — it is inactive, suspended or not yet verified.',
      });
  }

  return issues;
}

/** The question most callers actually have. */

export function isOpportunityValid(
  draft: Parameters<typeof validateOpportunity>[0],

  context: OpportunityContext,

  options?: OpportunityValidationOptions,
): boolean {
  return validateOpportunity(draft, context, options).length === 0;
}

/* -------------------------------------------------------------------------- */
/* UAE closing-date helpers                                                    */
/* -------------------------------------------------------------------------- */

/**
 * Returns the current calendar date in Dubai in YYYY-MM-DD format.
 * Used as the minimum date for the opportunity closing-date input.
 * Unlike toISOString().slice(0, 10), this uses UAE rather than UTC dates.
 */
export function closingDate(date: Date): string {
  if (Number.isNaN(date.getTime())) {
    throw new RangeError('Invalid date');
  }

  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Dubai',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date);

  const year = parts.find((part) => part.type === 'year')?.value;
  const month = parts.find((part) => part.type === 'month')?.value;
  const day = parts.find((part) => part.type === 'day')?.value;

  if (!year || !month || !day) {
    throw new Error('Unable to format UAE closing date');
  }

  return `${year}-${month}-${day}`;
}

/**
 * Converts a selected UAE calendar date into the final millisecond of that
 * date, expressed as an ISO-8601 UTC instant for the API.
 *
 * Example: closingInstant('2026-10-10') === '2026-10-10T19:59:59.999Z'
 */
export function closingInstant(date: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date);
  if (!match) {
    throw new RangeError('Expected a date in YYYY-MM-DD format');
  }

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);

  if (
    year < 1000 ||
    month < 1 ||
    month > 12 ||
    day < 1 ||
    day > new Date(Date.UTC(year, month, 0)).getUTCDate()
  ) {
    throw new RangeError('Invalid UAE closing date');
  }

  // UAE time stays UTC+04:00 throughout the year (no daylight saving).
  return new Date(`${date}T23:59:59.999+04:00`).toISOString();
}
