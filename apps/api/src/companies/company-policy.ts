import { BadRequestException, ConflictException } from '@nestjs/common';
import {
  acceptsInvestment,
  type CompanyPosition,
  type CompanyStatus,
  type CompanyType,
  type CompanyVerification,
} from '@afaq/types';

/**
 * The rules about companies, as plain functions.
 *
 * Kept out of the services so each rule can be read on its own and tested
 * without a database. The services decide when to ask; these decide the answer.
 */

/** The longest a slug may be. Matches nothing in the schema — it is our choice. */
const MAX_SLUG_LENGTH = 80;

/** Below this a slug is not worth having: "&" would become "". */
const MIN_SLUG_LENGTH = 2;

/**
 * Turns a company name into its slug.
 *
 * Runs once, when the company is created. The slug then never changes, because
 * it ends up in links people bookmark.
 */
export function slugFromName(name: string): string {
  const slug = name
    // NFKC, not NFKD. Decomposing splits an accented or Arabic letter into a
    // base plus a combining mark, and the mark is not a letter — so the name
    // comes out mangled: "مدقق إقليمي" would lose its hamza and break apart.
    .normalize('NFKC')
    .toLowerCase()
    // Any run of non-letters and non-digits becomes one dash. \p{L} keeps
    // Arabic and accented letters, which [a-z] would silently discard.
    .replace(/[^\p{L}\p{N}]+/gu, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, MAX_SLUG_LENGTH)
    // The slice may have left a trailing dash.
    .replace(/-+$/g, '');

  if (slug.length < MIN_SLUG_LENGTH) {
    throw new BadRequestException({
      reason: 'invalid_name',
      message: 'That name has too few letters and numbers to make a web address from.',
    });
  }

  return slug;
}

/** A name already in use. Its own exception so the interface can point at the field. */
export function slugTaken(slug: string): ConflictException {
  return new ConflictException({
    reason: 'duplicate_company',
    field: 'name',
    message: `Another company already uses the web address "${slug}". Choose a different name.`,
    slug,
  });
}

// ===========================================================================
// STATUS
// ===========================================================================

/**
 * Whether a status change is allowed.
 *
 * Any state may reach any other — a suspended company can be reinstated, an
 * inactive one can be suspended — so the only thing to refuse is a change that
 * changes nothing, which would otherwise write a meaningless audit entry.
 */
export function assertStatusChange(current: CompanyStatus, next: CompanyStatus): void {
  if (current === next) {
    throw new BadRequestException({
      reason: 'no_change',
      message: `That company is already ${next.toLowerCase()}.`,
    });
  }
}

// ===========================================================================
// VERIFICATION
// ===========================================================================

/**
 * Refuses to put an Afaq company through vetting.
 *
 * NOT_REQUIRED is not a stage of the process for them — the process does not
 * apply. Letting it be set would leave an internal company sitting at PENDING
 * for ever, looking unverified in every filter.
 */
export function assertVerifiable(type: CompanyType): void {
  if (type === 'INTERNAL') {
    throw new BadRequestException({
      reason: 'internal_company',
      message: 'Afaq’s own companies do not go through partner verification.',
    });
  }
}

/**
 * Whether a verification state may follow another.
 *
 * The one real rule: a company already VERIFIED cannot be rejected outright.
 * Withdrawing approval is a serious act, and going back through UNDER_REVIEW
 * forces it to be a decision somebody took rather than a mis-click on a menu.
 *
 * NOT_REQUIRED is never a destination: it is what an internal company is, not
 * something an outside company can be moved to.
 */
export function assertVerificationChange(
  current: CompanyVerification,
  next: CompanyVerification,
): void {
  if (current === next) {
    throw new BadRequestException({
      reason: 'no_change',
      message: 'That is already its verification state.',
    });
  }

  if (next === 'NOT_REQUIRED') {
    throw new BadRequestException({
      reason: 'invalid_transition',
      message: 'Only Afaq’s own companies are exempt from verification.',
    });
  }

  if (current === 'VERIFIED' && next === 'REJECTED') {
    throw new BadRequestException({
      reason: 'invalid_transition',
      message:
        'Move it back to under review before rejecting it, so withdrawing approval is a ' +
        'deliberate step.',
    });
  }
}

export interface InvestmentTarget {
  name: string;
  type: CompanyType;
  status: CompanyStatus;
  verification: CompanyVerification;
}

export function assertAcceptsInvestment(company: InvestmentTarget): void {
  if (acceptsInvestment(company)) return;

  if (company.status !== 'ACTIVE') {
    throw new ConflictException({
      reason: 'company_not_active',
      status: company.status,
      message:
        `${company.name} is ${company.status.toLowerCase()} and cannot take investment. ` +
        'Activate it first.',
    });
  }

  throw new ConflictException({
    reason: 'company_not_verified',
    verification: company.verification,
    message:
      `${company.name} is a partner company and has not passed its checks, so it cannot ` +
      'take investment yet.',
  });
}

// ===========================================================================
// ORDERING
// ===========================================================================

/** The gap left between companies, so one can be inserted without renumbering. */
const ORDER_STEP = 10;

/**
 * Checks a reorder covers exactly the companies it claims to.
 *
 * A partial list is the dangerous case: the interface sends what it has on
 * screen, and if that is one filtered page then everything absent would keep
 * its old number and the order would come out interleaved and wrong. Better to
 * refuse than to shuffle a list nobody asked to change.
 */
export function assertReorderIsComplete(
  sentIds: readonly string[],
  knownIds: readonly string[],
): void {
  const sent = new Set(sentIds);

  if (sent.size !== sentIds.length) {
    throw new BadRequestException({
      reason: 'duplicate_company',
      message: 'The same company appears twice in that order.',
    });
  }

  const unknown = sentIds.filter((id) => !knownIds.includes(id));
  if (unknown.length > 0) {
    throw new BadRequestException({
      reason: 'unknown_company',
      message: 'That order refers to a company that no longer exists.',
    });
  }

  const missing = knownIds.filter((id) => !sent.has(id));
  if (missing.length > 0) {
    throw new BadRequestException({
      reason: 'incomplete_order',
      message:
        `That order covers ${sentIds.length} of ${knownIds.length} companies. Send the whole ` +
        'list, or the ones left out would end up in the wrong place.',
    });
  }
}

/**
 * Turns an ordered list of ids into positions, spaced by ten.
 *
 * Renumbering from scratch rather than nudging: it keeps the gaps even, so the
 * next insertion has somewhere to go.
 */
export function positionsFor(orderedIds: readonly string[]): CompanyPosition[] {
  return orderedIds.map((id, index) => ({ id, displayOrder: (index + 1) * ORDER_STEP }));
}
