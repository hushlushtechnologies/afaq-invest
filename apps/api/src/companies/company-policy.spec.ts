import { BadRequestException, ConflictException } from '@nestjs/common';
import { describe, expect, it } from 'vitest';
import {
  assertAcceptsInvestment,
  assertReorderIsComplete,
  assertStatusChange,
  assertVerifiable,
  assertVerificationChange,
  positionsFor,
  slugFromName,
  slugTaken,
  type InvestmentTarget,
} from './company-policy.js';

/**
 * The company rules, checked without a database.
 *
 * Every one of these is a decision somebody could reasonably make differently,
 * so each test says what the rule is for rather than only that it holds.
 */

describe('slugFromName', () => {
  it('makes a readable address from an ordinary name', () => {
    expect(slugFromName('Afaq Al Manzil Properties')).toBe('afaq-al-manzil-properties');
  });

  it('collapses punctuation and ampersands into single dashes', () => {
    expect(slugFromName('Afaq Al Khaleej Management & Consultant')).toBe(
      'afaq-al-khaleej-management-consultant',
    );
  });

  it('trims dashes from both ends', () => {
    expect(slugFromName('  ...Hush Lush Events!  ')).toBe('hush-lush-events');
  });

  /**
   * The bug this guards against is real and was shipped once in Sprint 3.
   *
   * NFKD decomposes "إ" into an alif plus a hamza mark. The mark is not a
   * letter, so the character class replaces it with a dash and the word breaks
   * in half. NFKC composes instead, and the name survives.
   */
  it('keeps Arabic intact instead of splitting it on combining marks', () => {
    const slug = slugFromName('مدقق إقليمي');

    expect(slug).toBe('مدقق-إقليمي');
    expect(slug).not.toContain('--');
  });

  it('keeps accented Latin letters', () => {
    expect(slugFromName('Société Générale Café')).toBe('société-générale-café');
  });

  it('keeps digits', () => {
    expect(slugFromName('Optimus Megatron 24 Garage')).toBe('optimus-megatron-24-garage');
  });

  it('refuses a name with nothing to build an address from', () => {
    expect(() => slugFromName('&&& ---')).toThrow(BadRequestException);
    expect(() => slugFromName('')).toThrow(BadRequestException);
    // A single character is not worth a URL.
    expect(() => slugFromName('A')).toThrow(BadRequestException);
  });

  it('caps the length and never ends on a dash', () => {
    const slug = slugFromName('Afaq '.repeat(40));

    expect(slug.length).toBeLessThanOrEqual(80);
    expect(slug.endsWith('-')).toBe(false);
  });

  it('names the field when the address is taken, so the form can point at it', () => {
    const error = slugTaken('hush-lush-events');

    expect(error).toBeInstanceOf(ConflictException);
    expect(error.getResponse()).toMatchObject({
      reason: 'duplicate_company',
      field: 'name',
      slug: 'hush-lush-events',
    });
  });
});

describe('assertStatusChange', () => {
  it('allows every real move, in both directions', () => {
    expect(() => assertStatusChange('ACTIVE', 'INACTIVE')).not.toThrow();
    expect(() => assertStatusChange('ACTIVE', 'SUSPENDED')).not.toThrow();
    expect(() => assertStatusChange('SUSPENDED', 'ACTIVE')).not.toThrow();
    expect(() => assertStatusChange('INACTIVE', 'ACTIVE')).not.toThrow();
    expect(() => assertStatusChange('SUSPENDED', 'INACTIVE')).not.toThrow();
  });

  // Otherwise the audit trail fills with entries where nothing happened.
  it('refuses a change that changes nothing', () => {
    expect(() => assertStatusChange('ACTIVE', 'ACTIVE')).toThrow(BadRequestException);
  });
});

describe('assertVerifiable', () => {
  it('refuses to put an Afaq company through partner vetting', () => {
    expect(() => assertVerifiable('INTERNAL')).toThrow(BadRequestException);
  });

  it('allows it for an outside company', () => {
    expect(() => assertVerifiable('THIRD_PARTY')).not.toThrow();
  });
});

describe('assertVerificationChange', () => {
  it('walks an outside company through the normal path', () => {
    expect(() => assertVerificationChange('PENDING', 'UNDER_REVIEW')).not.toThrow();
    expect(() => assertVerificationChange('UNDER_REVIEW', 'VERIFIED')).not.toThrow();
    expect(() => assertVerificationChange('UNDER_REVIEW', 'REJECTED')).not.toThrow();
    expect(() => assertVerificationChange('REJECTED', 'UNDER_REVIEW')).not.toThrow();
  });

  /**
   * Withdrawing approval from a company investors can already see is serious
   * enough that it should not be one click on a dropdown.
   */
  it('will not reject a verified company outright', () => {
    expect(() => assertVerificationChange('VERIFIED', 'REJECTED')).toThrow(BadRequestException);
  });

  it('allows the same thing once it has gone back under review', () => {
    expect(() => assertVerificationChange('VERIFIED', 'UNDER_REVIEW')).not.toThrow();
    expect(() => assertVerificationChange('UNDER_REVIEW', 'REJECTED')).not.toThrow();
  });

  it('never lets an outside company become exempt', () => {
    expect(() => assertVerificationChange('VERIFIED', 'NOT_REQUIRED')).toThrow(BadRequestException);
    expect(() => assertVerificationChange('PENDING', 'NOT_REQUIRED')).toThrow(BadRequestException);
  });

  it('refuses a change that changes nothing', () => {
    expect(() => assertVerificationChange('VERIFIED', 'VERIFIED')).toThrow(BadRequestException);
  });
});

describe('assertAcceptsInvestment', () => {
  const company = (overrides: Partial<InvestmentTarget>): InvestmentTarget => ({
    name: 'Hush Lush Events',
    type: 'THIRD_PARTY',
    status: 'ACTIVE',
    verification: 'VERIFIED',
    ...overrides,
  });

  it('lets an active Afaq company through', () => {
    expect(() =>
      assertAcceptsInvestment(company({ type: 'INTERNAL', verification: 'NOT_REQUIRED' })),
    ).not.toThrow();
  });

  it('lets an active, verified partner through', () => {
    expect(() => assertAcceptsInvestment(company({}))).not.toThrow();
  });

  it.each(['INACTIVE', 'SUSPENDED'] as const)('refuses a company that is %s', (status) => {
    expect(() => assertAcceptsInvestment(company({ status }))).toThrow(ConflictException);
  });

  it.each(['PENDING', 'UNDER_REVIEW', 'REJECTED'] as const)(
    'refuses a partner whose checks are %s',
    (verification) => {
      expect(() => assertAcceptsInvestment(company({ verification }))).toThrow(ConflictException);
    },
  );

  /**
   * Status is reported before verification when both are wrong. "It is
   * suspended" is the thing to fix first, and being told about paperwork on a
   * suspended company sends somebody down the wrong path.
   */
  it('names the status when a company is both inactive and unverified', () => {
    try {
      assertAcceptsInvestment(company({ status: 'SUSPENDED', verification: 'PENDING' }));
      throw new Error('should have refused');
    } catch (error) {
      expect((error as ConflictException).getResponse()).toMatchObject({
        reason: 'company_not_active',
        status: 'SUSPENDED',
      });
    }
  });

  it('says which check is missing for an unverified partner', () => {
    try {
      assertAcceptsInvestment(company({ verification: 'PENDING' }));
      throw new Error('should have refused');
    } catch (error) {
      expect((error as ConflictException).getResponse()).toMatchObject({
        reason: 'company_not_verified',
        verification: 'PENDING',
      });
    }
  });

  // 409, not 403. The caller is allowed to do this; the company is not ready.
  it('refuses with a conflict rather than a permission error', () => {
    try {
      assertAcceptsInvestment(company({ status: 'INACTIVE' }));
      throw new Error('should have refused');
    } catch (error) {
      expect((error as ConflictException).getStatus()).toBe(409);
    }
  });
});

describe('assertReorderIsComplete', () => {
  const known = ['a', 'b', 'c'];

  it('accepts the whole list in any order', () => {
    expect(() => assertReorderIsComplete(['c', 'a', 'b'], known)).not.toThrow();
  });

  /**
   * The case that matters. The interface sends what is on screen; if that is a
   * filtered page, the companies left out would keep their old numbers and the
   * result would interleave. Refusing beats silently shuffling.
   */
  it('refuses a partial list', () => {
    expect(() => assertReorderIsComplete(['a', 'b'], known)).toThrow(BadRequestException);
  });

  it('refuses a duplicate', () => {
    expect(() => assertReorderIsComplete(['a', 'a', 'b', 'c'], known)).toThrow(BadRequestException);
  });

  it('refuses an id that is not a company', () => {
    expect(() => assertReorderIsComplete(['a', 'b', 'c', 'ghost'], known)).toThrow(
      BadRequestException,
    );
  });

  it('accepts an empty list when there are no companies', () => {
    expect(() => assertReorderIsComplete([], [])).not.toThrow();
  });
});

describe('positionsFor', () => {
  it('spaces positions by ten so one can be inserted between any two', () => {
    expect(positionsFor(['a', 'b', 'c'])).toEqual([
      { id: 'a', displayOrder: 10 },
      { id: 'b', displayOrder: 20 },
      { id: 'c', displayOrder: 30 },
    ]);
  });

  it('starts at ten, not zero, so there is room above the first', () => {
    expect(positionsFor(['only'])[0]?.displayOrder).toBe(10);
  });

  it('handles an empty list', () => {
    expect(positionsFor([])).toEqual([]);
  });
});
