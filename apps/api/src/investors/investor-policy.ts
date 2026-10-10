import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import {
  canInvestorMove,
  INVESTOR_MOVES,
  type InvestorMove,
  type InvestorStatus,
  type KycStanding,
  type StoredKycStanding,
} from '@afaq/types';

/**
 * The rules about investor accounts, as plain functions.
 *
 * Kept out of the services so each rule can be read on its own and tested
 * without a database. The business rules themselves — which status may
 * follow which, when a record may be withdrawn, what a standing means — live
 * in @afaq/types so the portals ask the same questions; this file turns their
 * answers into refusals and database filters.
 */

/* -------------------------------------------------------------------------- */
/* Filtering by KYC standing                                                  */
/* -------------------------------------------------------------------------- */

/**
 * What each standing means in terms of the two stored columns.
 *
 * The standing is not stored — EXPIRED is worked out from the date — so a
 * list filter has to say it in the columns that are. Written as data rather
 * than as Prisma conditions so it can be checked against `kycStanding` from
 * @afaq/types, the one definition of what a standing is: the spec walks every
 * stored status against every kind of expiry date and insists this table and
 * that function agree. A filter that disagreed would show "approved"
 * investors in the list who the detail page then calls expired.
 *
 * A standing matches when any one of its clauses does. Each clause is a set
 * of stored statuses and what the expiry date must be:
 *
 * - `future`     an approval still running
 * - `past`       an approval that has run out
 * - `none`       no date at all
 * - `notFuture`  no approval running: no date, or one that has run out
 * - `any`        the date does not matter
 */
export type ExpiryCondition = 'future' | 'past' | 'none' | 'notFuture' | 'any';

export type StandingClause = {
  statuses: readonly StoredKycStanding[];
  expiry: ExpiryCondition;
};

const NOT_REJECTED: readonly StoredKycStanding[] = [
  'NOT_STARTED',
  'IN_PROGRESS',
  'PENDING_REVIEW',
  'APPROVED',
];

export const STANDING_FILTERS: Record<KycStanding, readonly StandingClause[]> = {
  NOT_STARTED: [{ statuses: ['NOT_STARTED'], expiry: 'notFuture' }],
  IN_PROGRESS: [{ statuses: ['IN_PROGRESS'], expiry: 'notFuture' }],
  PENDING_REVIEW: [{ statuses: ['PENDING_REVIEW'], expiry: 'notFuture' }],
  APPROVED: [
    // A renewal in progress does not stop an approval still in date.
    { statuses: NOT_REJECTED, expiry: 'future' },
    // An approval with no end date is still an approval. Approving always
    // sets one today, but the standing says APPROVED, so the filter does too.
    { statuses: ['APPROVED'], expiry: 'none' },
  ],
  EXPIRED: [{ statuses: ['APPROVED'], expiry: 'past' }],
  // A rejection wins whatever the date says.
  REJECTED: [{ statuses: ['REJECTED'], expiry: 'any' }],
};

function expiryHolds(condition: ExpiryCondition, expires: number | null, now: number): boolean {
  switch (condition) {
    case 'future':
      return expires !== null && expires > now;
    case 'past':
      return expires !== null && expires <= now;
    case 'none':
      return expires === null;
    case 'notFuture':
      return expires === null || expires <= now;
    case 'any':
      return true;
    default: {
      const unhandled: never = condition;
      return unhandled;
    }
  }
}

/** The filter applied in memory — the spec uses this to check the table. */
export function matchesStanding(
  standing: KycStanding,
  investor: { kycStatus: StoredKycStanding; kycExpiresAt: Date | null },
  now: Date,
): boolean {
  const expires = investor.kycExpiresAt?.getTime() ?? null;

  return STANDING_FILTERS[standing].some(
    (clause) =>
      clause.statuses.includes(investor.kycStatus) &&
      expiryHolds(clause.expiry, expires, now.getTime()),
  );
}

function expiryWhere(condition: ExpiryCondition, now: Date): Record<string, unknown> {
  switch (condition) {
    case 'future':
      return { kycExpiresAt: { gt: now } };
    case 'past':
      return { kycExpiresAt: { lte: now } };
    case 'none':
      return { kycExpiresAt: null };
    case 'notFuture':
      return { OR: [{ kycExpiresAt: null }, { kycExpiresAt: { lte: now } }] };
    case 'any':
      return {};
    default: {
      const unhandled: never = condition;
      return unhandled;
    }
  }
}

/** The same filter, as a Prisma `where` fragment. */
export function standingWhere(standing: KycStanding, now: Date): Record<string, unknown> {
  const clauses = STANDING_FILTERS[standing].map((clause) => ({
    AND: [{ kycStatus: { in: [...clause.statuses] } }, expiryWhere(clause.expiry, now)],
  }));

  return clauses.length === 1 ? clauses[0]! : { OR: clauses };
}

/* -------------------------------------------------------------------------- */
/* Refusals                                                                   */
/* -------------------------------------------------------------------------- */

const PAST_TENSE: Record<InvestorMove, string> = {
  suspend: 'suspended',
  reinstate: 'reinstated',
  close: 'closed',
};

/**
 * Refuses an account change that does not start from where the account is.
 *
 * 409, not 400: the request is well formed and the caller may make it, but
 * the account is in a state that does not permit it.
 */
export function assertInvestorMove(move: InvestorMove, current: InvestorStatus): void {
  if (canInvestorMove(move, current)) return;

  if (current === INVESTOR_MOVES[move].to) {
    throw new BadRequestException({
      reason: 'no_change',
      message: `That account is already ${current.toLowerCase()}.`,
    });
  }

  throw new ConflictException({
    reason: current === 'CLOSED' ? 'closed' : 'invalid_transition',
    move,
    from: current,
    message:
      current === 'CLOSED'
        ? 'That account is closed and cannot change again.'
        : `An account that is ${current.toLowerCase()} cannot be ${PAST_TENSE[move]}.`,
  });
}

/** A closed account is the record of a relationship that ended. It is not edited. */
export function assertInvestorEditable(status: InvestorStatus): void {
  if (status !== 'CLOSED') return;

  throw new ConflictException({
    reason: 'closed',
    message: 'That account is closed, so its details can no longer be changed.',
  });
}

/**
 * The display name, once identity has been confirmed, is the confirmed name.
 *
 * Approval writes the verified name onto the account. Letting anyone retype
 * it afterwards would put a name in every list that nobody checked — the
 * name changes by submitting again, and being checked again.
 */
export function assertNameEditable(kycApprovedAt: Date | null): void {
  if (kycApprovedAt === null) return;

  throw new ConflictException({
    reason: 'name_verified',
    field: 'displayName',
    message:
      "The investor's name was confirmed by an identity check and can only change through a new one.",
  });
}

/** Only an unanswered invitation with no identity-check records may be removed. */
export function cannotWithdraw(status: InvestorStatus): ConflictException {
  return new ConflictException({
    reason: status === 'INVITED' ? 'has_kyc_records' : 'not_withdrawable',
    message:
      status === 'INVITED'
        ? 'This invitation already has identity-check records, so it is kept. Close the account instead.'
        : 'Only an invitation nobody has accepted can be withdrawn. Close the account instead.',
  });
}

/** Lost a race to somebody else changing the same account. */
export function changedMeanwhile(): ConflictException {
  return new ConflictException({
    reason: 'changed_meanwhile',
    message: 'Somebody else changed that investor a moment ago. Reload and try again.',
  });
}

export function investorNotFound(): NotFoundException {
  return new NotFoundException({
    reason: 'not_found',
    message: 'That investor does not exist.',
  });
}
