import { BadRequestException, ConflictException } from '@nestjs/common';
import { describe, expect, it } from 'vitest';
import type { ResolvedInvestmentTerms } from '@afaq/types';
import {
  assertArchivable,
  assertDeletable,
  assertEditable,
  assertPublishable,
  assertScopeIsCoherent,
  assertTermIsOffered,
  belowMinimum,
  computeQuote,
  GLOBAL_SCOPE_KEY,
  ladderRejection,
  scopeKeyFor,
} from './investment-rules-policy.js';

/**
 * The investment rule decisions, checked without a database.
 *
 * The money arithmetic below matters most: these are the figures the business
 * pays people, and a rounding error here is a rounding error in every
 * statement the platform ever produces.
 */

const COMPANY_ID = '11111111-1111-4111-8111-111111111111';

const terms = (overrides: Partial<ResolvedInvestmentTerms> = {}): ResolvedInvestmentTerms => ({
  ruleSetId: 'rs-1',
  ruleSetName: 'Ladder',
  ruleSetVersion: 1,
  scope: 'GLOBAL',
  companyId: null,
  tierId: 't-1',
  tierName: 'Tier 1',
  minAmount: 25_000,
  maxAmount: 250_000,
  mode: 'LOCKED',
  roiPercent: 4,
  roiBasis: 'MONTHLY',
  annualisedRoiPercent: 48,
  payoutFrequency: 'MONTHLY',
  minTermMonths: 12,
  maxTermMonths: 24,
  noticePeriodDays: 0,
  earnsDuringNotice: false,
  ...overrides,
});

// ---------------------------------------------------------------------------

describe('scope', () => {
  it('keys a platform-wide ladder by a constant', () => {
    expect(scopeKeyFor('GLOBAL', null)).toBe(GLOBAL_SCOPE_KEY);
  });

  it("keys a company's ladder by its company", () => {
    expect(scopeKeyFor('COMPANY', COMPANY_ID)).toBe(COMPANY_ID);
  });

  /**
   * Both of these would store a scopeKey that means nothing, and the unique
   * indexes that guarantee one live ladder per scope would then guard the
   * wrong thing.
   */
  it('refuses a company ladder with no company', () => {
    expect(() => assertScopeIsCoherent('COMPANY', null)).toThrow(BadRequestException);
  });

  it('refuses a platform-wide ladder that names a company', () => {
    expect(() => assertScopeIsCoherent('GLOBAL', COMPANY_ID)).toThrow(BadRequestException);
  });

  it('names the field, so the form can point at it', () => {
    try {
      assertScopeIsCoherent('COMPANY', null);
      throw new Error('should have refused');
    } catch (error) {
      expect((error as BadRequestException).getResponse()).toMatchObject({
        reason: 'company_required',
        field: 'companyId',
      });
    }
  });
});

describe('only a draft can be edited', () => {
  it('allows a draft', () => {
    expect(() => assertEditable('DRAFT')).not.toThrow();
  });

  /**
   * The point of the whole versioning scheme. Editing the live ladder would
   * silently re-price every investment already sold under it.
   */
  it('refuses the live one, and says to make a new version', () => {
    try {
      assertEditable('ACTIVE');
      throw new Error('should have refused');
    } catch (error) {
      expect((error as ConflictException).getStatus()).toBe(409);
      expect((error as ConflictException).getResponse()).toMatchObject({ reason: 'rule_set_live' });
    }
  });

  it('refuses an archived one, because it is the record of what was sold', () => {
    expect(() => assertEditable('ARCHIVED')).toThrow(ConflictException);
  });
});

describe('publishing', () => {
  it('allows a draft', () => {
    expect(() => assertPublishable('DRAFT')).not.toThrow();
  });

  it('refuses one that is already live', () => {
    try {
      assertPublishable('ACTIVE');
      throw new Error('should have refused');
    } catch (error) {
      expect((error as ConflictException).getResponse()).toMatchObject({ reason: 'already_live' });
    }
  });

  it('refuses to re-publish an archived one', () => {
    expect(() => assertPublishable('ARCHIVED')).toThrow(ConflictException);
  });
});

describe('archiving', () => {
  it('allows the live one', () => {
    expect(() => assertArchivable('ACTIVE')).not.toThrow();
  });

  it('refuses a draft, and points at deleting instead', () => {
    try {
      assertArchivable('DRAFT');
      throw new Error('should have refused');
    } catch (error) {
      expect((error as ConflictException).getResponse()).toMatchObject({ reason: 'not_live' });
    }
  });

  it('refuses one already archived', () => {
    expect(() => assertArchivable('ARCHIVED')).toThrow(ConflictException);
  });
});

describe('deleting', () => {
  it('allows a draft', () => {
    expect(() => assertDeletable('DRAFT')).not.toThrow();
  });

  it('refuses the live one', () => {
    expect(() => assertDeletable('ACTIVE')).toThrow(ConflictException);
  });

  /**
   * The one deletion that must never happen: an archived set is the evidence
   * of what an existing investor was sold.
   */
  it('never deletes an archived one', () => {
    expect(() => assertDeletable('ARCHIVED')).toThrow(ConflictException);
  });
});

describe('ladderRejection', () => {
  it('uses the single issue as the message when there is only one', () => {
    const error = ladderRejection([{ code: 'gap', message: 'Nothing covers 1 to 2.' }]);

    expect(error.getResponse()).toMatchObject({
      reason: 'invalid_ladder',
      message: 'Nothing covers 1 to 2.',
    });
  });

  it('carries every issue so the form can highlight them all at once', () => {
    const error = ladderRejection([
      { code: 'gap', message: 'a' },
      { code: 'roi_above_cap', message: 'b' },
    ]);

    const body = error.getResponse() as { issues: unknown[]; message: string };

    expect(body.issues).toHaveLength(2);
    expect(body.message).toContain('2 problems');
  });
});

describe('computeQuote', () => {
  /** 4% a month on 50,000 is 2,000 a month — the obvious check. */
  it('works out a monthly rate paid monthly', () => {
    const quote = computeQuote(50_000, terms(), 'AED', 12);

    expect(quote.returnPerPayout).toBe(2_000);
    expect(quote.payoutsPerYear).toBe(12);
    expect(quote.returnPerYear).toBe(24_000);
    expect(quote.totalReturnOverTerm).toBe(24_000);
  });

  /** A yearly rate paid monthly is an ordinary product, and must divide. */
  it('divides an annual rate across monthly payouts', () => {
    const quote = computeQuote(
      500_000,
      terms({ roiPercent: 10, roiBasis: 'ANNUAL', annualisedRoiPercent: 10 }),
      'AED',
      12,
    );

    expect(quote.returnPerYear).toBe(50_000);
    expect(quote.returnPerPayout).toBe(4_166.67);
  });

  /**
   * Each figure is rounded once, on its own. Twelve monthly payments of
   * 4,166.67 come to 50,000.04, which is four fils more than the year's
   * return — real, and reconciled when distributions are actually paid, not
   * papered over here.
   */
  it('rounds each figure independently, and does not pretend they reconcile', () => {
    const quote = computeQuote(
      500_000,
      terms({ roiPercent: 10, roiBasis: 'ANNUAL', annualisedRoiPercent: 10 }),
      'AED',
      null,
    );

    const twelvePayments = (quote.returnPerPayout as number) * 12;

    expect(twelvePayments).not.toBe(quote.returnPerYear);
    expect(Math.abs(twelvePayments - quote.returnPerYear)).toBeLessThan(0.1);
  });

  it('carries the term over more than a year', () => {
    const quote = computeQuote(50_000, terms(), 'AED', 18);

    expect(quote.totalReturnOverTerm).toBe(36_000);
  });

  it('gives no per-payout figure when the return comes at maturity', () => {
    const quote = computeQuote(50_000, terms({ payoutFrequency: 'ON_MATURITY' }), 'AED', 12);

    expect(quote.payoutsPerYear).toBeNull();
    expect(quote.returnPerPayout).toBeNull();
    expect(quote.returnPerYear).toBe(24_000);
  });

  it('gives no total when no term was chosen', () => {
    const quote = computeQuote(50_000, terms({ minTermMonths: null }), 'AED', null);

    expect(quote.totalReturnOverTerm).toBeNull();
    expect(quote.termMonths).toBeNull();
  });

  /**
   * The reason every step is integer fils. 0.07 × 3 is 0.21000000000000002 in
   * floating point; done in fils it is exactly 21.
   */
  it('keeps awkward fractions exact', () => {
    const quote = computeQuote(
      33_333.33,
      terms({ roiPercent: 0.7, roiBasis: 'MONTHLY', annualisedRoiPercent: 8.4 }),
      'AED',
      null,
    );

    // 33,333.33 × 8.4% = 2,800.0 (to the fils), not 2,799.999999…
    expect(quote.returnPerYear).toBe(2_800);
    expect(Number.isInteger(Math.round(quote.returnPerYear * 100))).toBe(true);
  });

  it('passes the terms and currency through untouched', () => {
    const resolved = terms();
    const quote = computeQuote(50_000, resolved, 'AED', 12);

    expect(quote.currency).toBe('AED');
    expect(quote.amount).toBe(50_000);
    expect(quote.terms).toBe(resolved);
  });
});

describe('assertTermIsOffered', () => {
  it('accepts a term inside the range', () => {
    expect(() => assertTermIsOffered(18, terms())).not.toThrow();
  });

  it('accepts the exact bounds', () => {
    expect(() => assertTermIsOffered(12, terms())).not.toThrow();
    expect(() => assertTermIsOffered(24, terms())).not.toThrow();
  });

  it('refuses a term shorter than the tier offers', () => {
    try {
      assertTermIsOffered(6, terms());
      throw new Error('should have refused');
    } catch (error) {
      expect((error as BadRequestException).getResponse()).toMatchObject({
        reason: 'term_too_short',
        field: 'termMonths',
      });
    }
  });

  it('refuses a term longer than the tier offers', () => {
    expect(() => assertTermIsOffered(36, terms())).toThrow(BadRequestException);
  });

  /** A locked investment with no term is not a locked investment. */
  it('insists on a term when the option has a minimum', () => {
    try {
      assertTermIsOffered(null, terms());
      throw new Error('should have refused');
    } catch (error) {
      expect((error as BadRequestException).getResponse()).toMatchObject({
        reason: 'term_required',
      });
    }
  });

  it('allows no term at all on an open-ended option', () => {
    expect(() =>
      assertTermIsOffered(null, terms({ minTermMonths: null, maxTermMonths: null })),
    ).not.toThrow();
  });
});

describe('belowMinimum', () => {
  it('says what the minimum is, in the platform currency', () => {
    const error = belowMinimum(1_000, 25_000, 'AED');

    expect(error.getResponse()).toMatchObject({
      reason: 'below_minimum',
      field: 'amount',
      minimum: 25_000,
    });
    expect((error.getResponse() as { message: string }).message).toContain('25,000');
  });
});
