import { describe, expect, it } from 'vitest';
import {
  canTransition,
  daysRemaining,
  fundingPercent,
  investmentAvailability,
  isFinished,
  OPPORTUNITY_ISSUE_CODES,
  OPPORTUNITY_STATUSES,
  remainingCapacity,
  termsAreLocked,
  validateOpportunity,
  type OpportunityContext,
  type OpportunityStatus,
} from '@afaq/types';

/**
 * The rules that decide whether money may arrive.
 *
 * Only @afaq/types is imported, so this runs without a database. Everything
 * here is a business rule that two portals and the API all have to agree
 * about, and the cheapest place to pin it down is a pure function with a test
 * beside it.
 */

const NOW = new Date('2026-06-01T12:00:00.000Z');

const INTERNAL = { type: 'INTERNAL', status: 'ACTIVE', verification: 'NOT_REQUIRED' } as const;
const PARTNER = { type: 'THIRD_PARTY', status: 'ACTIVE', verification: 'VERIFIED' } as const;

function raise(overrides: Partial<Parameters<typeof investmentAvailability>[0]> = {}) {
  return {
    status: 'OPEN' as OpportunityStatus,
    closesAt: '2026-12-31T00:00:00.000Z' as string | null,
    committedAmount: 0,
    targetAmount: 5_000_000,
    ...overrides,
  };
}

/* -------------------------------------------------------------------------- */

describe('the status machine', () => {
  it('lets a draft open or be abandoned, and nothing else', () => {
    expect(canTransition('DRAFT', 'OPEN')).toBe(true);
    expect(canTransition('DRAFT', 'CANCELLED')).toBe(true);

    expect(canTransition('DRAFT', 'FULLY_FUNDED')).toBe(false);
    expect(canTransition('DRAFT', 'CLOSED')).toBe(false);
    expect(canTransition('DRAFT', 'SUSPENDED')).toBe(false);
  });

  it('allows a suspended raise to resume', () => {
    expect(canTransition('OPEN', 'SUSPENDED')).toBe(true);
    expect(canTransition('SUSPENDED', 'OPEN')).toBe(true);
  });

  /**
   * The case this table exists for. A finished raise is the record of what
   * happened; reopening it would overwrite that record rather than add to it,
   * and a raise that needs to happen again is a new opportunity.
   */
  it('never reopens a finished raise', () => {
    for (const status of OPPORTUNITY_STATUSES) {
      expect(canTransition('CLOSED', status), `CLOSED → ${status}`).toBe(false);
      expect(canTransition('CANCELLED', status), `CANCELLED → ${status}`).toBe(false);
    }
  });

  it('only lets a fully funded raise be closed', () => {
    expect(canTransition('FULLY_FUNDED', 'CLOSED')).toBe(true);

    for (const status of OPPORTUNITY_STATUSES.filter((value) => value !== 'CLOSED')) {
      expect(canTransition('FULLY_FUNDED', status), `FULLY_FUNDED → ${status}`).toBe(false);
    }
  });

  it('knows which statuses are over', () => {
    expect(isFinished('CLOSED')).toBe(true);
    expect(isFinished('CANCELLED')).toBe(true);
    expect(isFinished('FULLY_FUNDED')).toBe(false);
    expect(isFinished('SUSPENDED')).toBe(false);
  });

  it('locks the terms the moment a draft stops being a draft', () => {
    expect(termsAreLocked('DRAFT')).toBe(false);

    for (const status of OPPORTUNITY_STATUSES.filter((value) => value !== 'DRAFT')) {
      expect(termsAreLocked(status), status).toBe(true);
    }
  });
});

describe('whether an investment may be accepted', () => {
  it('accepts money into an open raise with room left', () => {
    expect(investmentAvailability(raise(), INTERNAL, NOW)).toEqual({ open: true });
    expect(investmentAvailability(raise(), PARTNER, NOW)).toEqual({ open: true });
  });

  /**
   * The company is checked first on purpose. Telling somebody a raise is
   * "fully funded" when the truth is that the company may not receive
   * investment at all would be a lie of emphasis.
   */
  it('blames the company before anything else', () => {
    const suspended = { ...INTERNAL, status: 'SUSPENDED' } as const;

    expect(investmentAvailability(raise({ committedAmount: 5_000_000 }), suspended, NOW)).toEqual({
      open: false,
      reason: 'company_unavailable',
    });
  });

  it('refuses an unverified partner however healthy the raise looks', () => {
    const pending = { ...PARTNER, verification: 'PENDING' } as const;

    expect(investmentAvailability(raise(), pending, NOW)).toEqual({
      open: false,
      reason: 'company_unavailable',
    });
  });

  it('distinguishes a full raise from a stopped one', () => {
    expect(investmentAvailability(raise({ status: 'FULLY_FUNDED' }), INTERNAL, NOW)).toEqual({
      open: false,
      reason: 'fully_funded',
    });

    expect(investmentAvailability(raise({ status: 'SUSPENDED' }), INTERNAL, NOW)).toEqual({
      open: false,
      reason: 'not_open',
    });

    expect(investmentAvailability(raise({ status: 'CANCELLED' }), INTERNAL, NOW)).toEqual({
      open: false,
      reason: 'not_open',
    });
  });

  /**
   * The hard cap, which is the whole reason the target is not just a progress
   * bar: the last investment may fill the raise exactly, and the one after it
   * is refused.
   */
  it('stops at the target rather than past it', () => {
    expect(investmentAvailability(raise({ committedAmount: 4_999_999 }), INTERNAL, NOW)).toEqual({
      open: true,
    });

    expect(investmentAvailability(raise({ committedAmount: 5_000_000 }), INTERNAL, NOW)).toEqual({
      open: false,
      reason: 'fully_funded',
    });

    // Over-committed is a reconciliation problem, not a reason to keep taking
    // money.
    expect(investmentAvailability(raise({ committedAmount: 5_000_001 }), INTERNAL, NOW)).toEqual({
      open: false,
      reason: 'fully_funded',
    });
  });

  /**
   * A passed closing date closes the raise whether or not anybody has got
   * round to pressing the button, because the alternative is accepting money
   * into a raise that advertised itself as shut.
   */
  it('closes on the date without waiting to be told', () => {
    const past = raise({ closesAt: '2026-05-31T23:59:59.000Z' });

    expect(investmentAvailability(past, INTERNAL, NOW)).toEqual({
      open: false,
      reason: 'window_passed',
    });
  });

  it('treats the closing instant as closed, not as the last second open', () => {
    const exactly = raise({ closesAt: NOW.toISOString() });

    expect(investmentAvailability(exactly, INTERNAL, NOW)).toEqual({
      open: false,
      reason: 'window_passed',
    });
  });

  it('accepts an open-ended raise with no closing date', () => {
    expect(investmentAvailability(raise({ closesAt: null }), INTERNAL, NOW)).toEqual({
      open: true,
    });
  });
});

describe('funding arithmetic', () => {
  it('reports headroom, never a negative one', () => {
    expect(remainingCapacity({ committedAmount: 1_000_000, targetAmount: 5_000_000 })).toBe(
      4_000_000,
    );
    expect(remainingCapacity({ committedAmount: 6_000_000, targetAmount: 5_000_000 })).toBe(0);
  });

  it('clamps the percentage at both ends', () => {
    expect(fundingPercent({ committedAmount: 0, targetAmount: 5_000_000 })).toBe(0);
    expect(fundingPercent({ committedAmount: 2_500_000, targetAmount: 5_000_000 })).toBe(50);
    expect(fundingPercent({ committedAmount: 5_000_000, targetAmount: 5_000_000 })).toBe(100);
    expect(fundingPercent({ committedAmount: 9_000_000, targetAmount: 5_000_000 })).toBe(100);
  });

  it('reads a zero target as empty rather than dividing by it', () => {
    expect(fundingPercent({ committedAmount: 0, targetAmount: 0 })).toBe(0);
    expect(fundingPercent({ committedAmount: 100, targetAmount: 0 })).toBe(0);
  });

  it('rounds the days left up, so the last partial day still counts', () => {
    expect(daysRemaining({ closesAt: '2026-06-03T12:00:00.000Z' }, NOW)).toBe(2);
    // Six hours left is one day, not none.
    expect(daysRemaining({ closesAt: '2026-06-01T18:00:00.000Z' }, NOW)).toBe(1);
    expect(daysRemaining({ closesAt: '2026-05-01T00:00:00.000Z' }, NOW)).toBe(0);
    expect(daysRemaining({ closesAt: null }, NOW)).toBeNull();
  });
});

/* -------------------------------------------------------------------------- */

function context(overrides: Partial<OpportunityContext> = {}): OpportunityContext {
  return {
    minimumInvestment: 25_000,
    currentStatus: 'DRAFT',
    committedAmount: 0,
    previousTarget: null,
    companyAcceptsInvestment: true,
    hasLiveLadder: true,
    opensAt: null,
    now: NOW,
    ...overrides,
  };
}

const DRAFT = {
  companyId: '11111111-1111-4111-8111-111111111111',
  title: 'Al Jaddaf Tower — Phase 2',
  targetAmount: 5_000_000,
  closesAt: '2026-12-31T00:00:00.000Z' as string | null,
};

function codes(issues: { code: string }[]): string[] {
  return issues.map((issue) => issue.code).sort();
}

describe('validating a draft', () => {
  it('passes a complete one', () => {
    expect(validateOpportunity(DRAFT, context())).toEqual([]);
  });

  it('wants a title and a company', () => {
    expect(
      codes(validateOpportunity({ ...DRAFT, title: '   ', companyId: '' }, context())),
    ).toEqual(['no_company', 'no_title']);
  });

  it('refuses a target of nothing', () => {
    expect(codes(validateOpportunity({ ...DRAFT, targetAmount: 0 }, context()))).toEqual([
      'target_not_positive',
    ]);
  });

  /**
   * A raise smaller than one permitted investment cannot be filled by
   * anybody, which is a stranger thing to debug than to prevent.
   */
  it('refuses a target below one permitted investment', () => {
    const issues = validateOpportunity({ ...DRAFT, targetAmount: 10_000 }, context());

    expect(codes(issues)).toEqual(['target_below_minimum']);
    expect(issues[0]?.values).toEqual({ minimum: 25_000, target: 10_000 });
  });

  it('reports every problem at once, not the first', () => {
    const issues = validateOpportunity(
      { ...DRAFT, title: '', companyId: '', targetAmount: -1 },
      context(),
    );

    expect(codes(issues)).toEqual(['no_company', 'no_title', 'target_not_positive']);
  });
});

describe('changing a raise that has already opened', () => {
  it('lets the target be raised', () => {
    const issues = validateOpportunity(
      { ...DRAFT, targetAmount: 8_000_000 },
      context({ currentStatus: 'OPEN', previousTarget: 5_000_000 }),
    );

    expect(issues).toEqual([]);
  });

  it('refuses to lower it', () => {
    const issues = validateOpportunity(
      { ...DRAFT, targetAmount: 4_000_000 },
      context({ currentStatus: 'OPEN', previousTarget: 5_000_000 }),
    );

    expect(codes(issues)).toEqual(['target_lowered']);
    expect(issues[0]?.values).toEqual({ from: 5_000_000, to: 4_000_000 });
  });

  it('lets the target of a draft move freely in either direction', () => {
    expect(
      validateOpportunity(
        { ...DRAFT, targetAmount: 1_000_000 },
        context({ currentStatus: 'DRAFT', previousTarget: 5_000_000 }),
      ),
    ).toEqual([]);
  });

  /** Incoherent in any status: the money is already in. */
  it('never allows a target below what has been committed', () => {
    const issues = validateOpportunity(
      { ...DRAFT, targetAmount: 1_000_000 },
      context({ currentStatus: 'DRAFT', committedAmount: 2_000_000 }),
    );

    expect(codes(issues)).toEqual(['target_below_committed']);
  });
});

describe('opening is a higher bar than saving', () => {
  it('needs a published ladder to pin', () => {
    const asDraft = validateOpportunity(DRAFT, context({ hasLiveLadder: false }));
    const onOpening = validateOpportunity(DRAFT, context({ hasLiveLadder: false }), {
      opening: true,
    });

    // Saving the draft is fine; opening it is not, because there would be
    // nothing to price it with.
    expect(asDraft).toEqual([]);
    expect(codes(onOpening)).toEqual(['no_live_ladder']);
  });

  it('needs a company that may receive investment', () => {
    const issues = validateOpportunity(DRAFT, context({ companyAcceptsInvestment: false }), {
      opening: true,
    });

    expect(codes(issues)).toEqual(['company_not_accepting']);
  });

  it('refuses a closing date that has already passed', () => {
    const past = { ...DRAFT, closesAt: '2026-01-01T00:00:00.000Z' };

    // Still savable — somebody may be mid-edit — but not openable.
    expect(validateOpportunity(past, context())).toEqual([]);
    expect(codes(validateOpportunity(past, context(), { opening: true }))).toEqual([
      'close_in_past',
    ]);
  });

  it('refuses a window that closes before it opens', () => {
    const issues = validateOpportunity(
      { ...DRAFT, closesAt: '2026-03-01T00:00:00.000Z' },
      context({ opensAt: new Date('2026-04-01T00:00:00.000Z') }),
    );

    expect(codes(issues)).toEqual(['close_before_open']);
  });

  it('is happy with an open-ended raise', () => {
    expect(validateOpportunity({ ...DRAFT, closesAt: null }, context(), { opening: true })).toEqual(
      [],
    );
  });
});

describe('every refusal explains itself', () => {
  /**
   * Builds a draft that trips every issue at once, so each code's message is
   * exercised. The API returns these sentences in its 400 responses, the same
   * way it returns a ladder issue's, so an empty one — or one that printed
   * `undefined` because a value went missing — is a broken error response.
   */
  it('gives every issue an English message with its numbers filled in', () => {
    const everything = [
      ...validateOpportunity(
        { companyId: '', title: '', targetAmount: 10_000, closesAt: '2026-01-01T00:00:00.000Z' },
        context({
          currentStatus: 'OPEN',
          previousTarget: 50_000,
          committedAmount: 20_000,
          hasLiveLadder: false,
          companyAcceptsInvestment: false,
          opensAt: new Date('2026-02-01T00:00:00.000Z'),
        }),
        { opening: true },
      ),
      ...validateOpportunity({ ...DRAFT, targetAmount: 0 }, context()),
    ];

    const seen = new Set(everything.map((issue) => issue.code));

    // The fixture has to actually reach every code, or this test proves less
    // than it claims.
    expect([...seen].sort()).toEqual([...OPPORTUNITY_ISSUE_CODES].sort());

    for (const issue of everything) {
      expect(issue.message.trim(), issue.code).not.toBe('');
      expect(issue.message, issue.code).not.toMatch(/undefined|NaN|null/);
    }
  });
});