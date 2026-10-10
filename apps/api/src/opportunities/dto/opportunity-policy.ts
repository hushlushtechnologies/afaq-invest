import { BadRequestException, ConflictException } from '@nestjs/common';
import { isFinished, type OpportunityIssue, type OpportunityStatus } from '@afaq/types';

/**
 * The rules about opportunities, as plain functions.
 *
 * Kept out of the services so each rule can be read on its own and tested
 * without a database. The services decide when to ask; these decide the
 * answer. The business rules themselves — the transition table, what counts
 * as valid — live in @afaq/types, so the Admin Portal asks the same questions
 * and gets the same answers. This file turns those answers into refusals.
 */

/** The longest a slug may be, before any "-2" suffix is added. */
const MAX_SLUG_LENGTH = 80;

/** Below this a slug is not worth having. */
const MIN_SLUG_LENGTH = 2;

/** The most suffixes tried before giving up and asking for a different title. */
export const MAX_SLUG_ATTEMPTS = 50;

/**
 * Turns a title into the base of its slug.
 *
 * The same normalisation as a company's — NFKC, letters in any script kept,
 * everything else collapsed to a single dash — so the two kinds of address
 * look like they belong to the same product. Written out here rather than
 * shared because the refusal has to name the title, not a company name.
 */
export function slugBaseFromTitle(title: string): string {
  const slug = title
    .normalize('NFKC')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, MAX_SLUG_LENGTH)
    .replace(/-+$/g, '');

  if (slug.length < MIN_SLUG_LENGTH) {
    throw new BadRequestException({
      reason: 'invalid_title',
      field: 'title',
      message: 'That title has too few letters and numbers to make a web address from.',
    });
  }

  return slug;
}

/**
 * The first free slug, given the ones already taken.
 *
 * Unlike a company, two raises may well share a title — "Phase 2" is a
 * perfectly good name for a raise at two different developers. So a clash is
 * not refused; it is numbered: `phase-2`, then `phase-2-2`, `phase-2-3`.
 * The number is the order of arrival, not a version: nothing about the second
 * raise is a revision of the first.
 */
export function firstFreeSlug(base: string, taken: ReadonlySet<string>): string {
  if (!taken.has(base)) return base;

  for (let attempt = 2; attempt <= MAX_SLUG_ATTEMPTS; attempt += 1) {
    const candidate = `${base}-${attempt}`;
    if (!taken.has(candidate)) return candidate;
  }

  throw new ConflictException({
    reason: 'slug_exhausted',
    field: 'title',
    message: `Too many opportunities already use the title "${base}". Choose a more specific title.`,
  });
}

// ===========================================================================
// STATUS
// ===========================================================================

/**
 * The status changes an administrator can make, each by name.
 *
 * Named moves rather than "set the status to X", because two of them end in
 * the same place and mean different things. Opening a draft pins the live
 * ladder; resuming a suspended raise must not, or it would quietly re-price a
 * raise investors have already seen. So `open` starts only from DRAFT and
 * `resume` only from SUSPENDED, even though both end at OPEN.
 *
 * FULLY_FUNDED is not here: no administrator declares a raise full. It will be
 * set by the investment that fills it, in the phase that accepts investments.
 *
 * Every move here must also be allowed by OPPORTUNITY_STATUS_TRANSITIONS in
 * @afaq/types; opportunity-policy.spec.ts fails if the two disagree.
 */
export const OPPORTUNITY_MOVES = {
  open: { from: ['DRAFT'], to: 'OPEN' },
  suspend: { from: ['OPEN'], to: 'SUSPENDED' },
  resume: { from: ['SUSPENDED'], to: 'OPEN' },
  close: { from: ['OPEN', 'SUSPENDED', 'FULLY_FUNDED'], to: 'CLOSED' },
  cancel: { from: ['DRAFT', 'OPEN', 'SUSPENDED'], to: 'CANCELLED' },
} as const satisfies Record<string, { from: readonly OpportunityStatus[]; to: OpportunityStatus }>;

export type OpportunityMove = keyof typeof OPPORTUNITY_MOVES;

/**
 * Refuses a move that does not start from where the raise is.
 *
 * 409, not 400: the request is well formed and the caller may make it, but
 * the raise is in a state that does not permit it. The message says which
 * state, so nobody has to guess.
 */
export function assertMove(move: OpportunityMove, current: OpportunityStatus): void {
  const { from, to } = OPPORTUNITY_MOVES[move];

  if ((from as readonly OpportunityStatus[]).includes(current)) return;

  if (current === to) {
    throw new BadRequestException({
      reason: 'no_change',
      message: `That opportunity is already ${describe(to)}.`,
    });
  }

  throw new ConflictException({
    reason: 'invalid_transition',
    move,
    from: current,
    message: isFinished(current)
      ? `That opportunity is ${describe(current)} and cannot change again. A raise that needs ` +
        'to run again is a new opportunity.'
      : current === 'SUSPENDED' && move === 'open'
        ? 'That opportunity is suspended. Resume it instead — opening would re-price it.'
        : `An opportunity that is ${describe(current)} cannot be ${PAST_TENSE[move]}.`,
  });
}

const PAST_TENSE: Record<OpportunityMove, string> = {
  open: 'opened',
  suspend: 'suspended',
  resume: 'resumed',
  close: 'closed',
  cancel: 'cancelled',
};

/**
 * Refuses any edit to a finished raise.
 *
 * A closed or cancelled opportunity is the record of what was offered. Editing
 * its description afterwards would rewrite that record, and the audit trail
 * would then hold the only copy of what investors actually saw.
 */
export function assertEditable(status: OpportunityStatus): void {
  if (isFinished(status)) {
    throw new ConflictException({
      reason: 'finished',
      message: `That opportunity is ${describe(status)} and can no longer be changed.`,
    });
  }
}

/** Only a draft may be thrown away. Anything opened is part of the record. */
export function assertDeletable(status: OpportunityStatus): void {
  if (status !== 'DRAFT') {
    throw new ConflictException({
      reason: 'not_a_draft',
      message:
        'Only a draft can be deleted. An opportunity that has been opened is part of the ' +
        'record — cancel or close it instead.',
    });
  }
}

/**
 * The company of an opened raise is fixed.
 *
 * Moving a live raise to a different company would change who investors are
 * putting money into, after they were shown the first one.
 */
export function assertCompanyChangeable(status: OpportunityStatus): void {
  if (status !== 'DRAFT') {
    throw new ConflictException({
      reason: 'company_locked',
      field: 'companyId',
      message: 'The company of an opportunity that has been opened cannot be changed.',
    });
  }
}

/**
 * The refusal for a draft that fails validation.
 *
 * The issues go back whole — code, field and message for each — so the Admin
 * form can highlight every field at once, the same shape a rejected ladder
 * uses.
 */
export function opportunityRejection(issues: readonly OpportunityIssue[]): BadRequestException {
  return new BadRequestException({
    reason: 'invalid_opportunity',
    message: issues.map((issue) => issue.message).join(' '),
    issues,
  });
}

/**
 * Lost a race to somebody else changing the same raise.
 *
 * Every status change is written conditionally — "move it to OPEN if it is
 * still DRAFT" — so two administrators pressing Open at the same moment
 * cannot both succeed and write two audit entries for one event.
 */
export function changedMeanwhile(): ConflictException {
  return new ConflictException({
    reason: 'changed_meanwhile',
    message: 'Somebody else changed that opportunity a moment ago. Reload it and try again.',
  });
}

/** No published ladder to pin, discovered inside the opening transaction. */
export function noLadderToPin(): ConflictException {
  return new ConflictException({
    reason: 'no_live_ladder',
    message:
      'No investment rules are published for this company or platform-wide, so there are no ' +
      'terms to open it with. Publish a ladder first.',
  });
}

function describe(status: OpportunityStatus): string {
  return status.toLowerCase().replace('_', ' ');
}
