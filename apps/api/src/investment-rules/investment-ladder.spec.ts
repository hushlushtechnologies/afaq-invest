import { describe, expect, it } from 'vitest';
import {
  annualisedBasisPoints,
  annualisedRoi,
  findTierIndex,
  isLadderValid,
  validateTierLadder,
  type LadderContext,
  type LadderIssueCode,
  type TierDraft,
  type TierOptionDraft,
} from '@afaq/types';

/**
 * The investment ladder rules, checked without a database.
 *
 * These are the rules the Admin form and the API both run, so a mistake here
 * is a mistake in two places at once. Every test says what the rule is for,
 * not only that it holds.
 *
 * The amounts below are made up. The real Afaq ladder is seeded in a later
 * phase, from numbers confirmed at that point — nothing here asserts what the
 * business actually charges.
 */

// ---------------------------------------------------------------------------
// Builders, so each test states only the thing it is about
// ---------------------------------------------------------------------------

const option = (overrides: Partial<TierOptionDraft> = {}): TierOptionDraft => ({
  mode: 'LOCKED',
  roiPercent: 4,
  payoutFrequency: 'MONTHLY',
  minTermMonths: 12,
  maxTermMonths: 24,
  noticePeriodDays: 90,
  earnsDuringNotice: false,
  ...overrides,
});

const tier = (overrides: Partial<TierDraft> = {}): TierDraft => ({
  name: 'Tier',
  minAmount: 50_000,
  maxAmount: null,
  options: [option()],
  ...overrides,
});

const context: LadderContext = {
  roiBasis: 'MONTHLY',
  minimumInvestment: 50_000,
  maxRoiPercent: 10,
  maxRoiBasis: 'MONTHLY',
};

/** A ladder that should pass everything, to vary one thing at a time from. */
const soundLadder: TierDraft[] = [
  {
    name: 'Starter',
    minAmount: 50_000,
    maxAmount: 250_000,
    options: [
      option({ roiPercent: 4 }),
      option({ mode: 'UNLOCKED', roiPercent: 3, minTermMonths: null, maxTermMonths: null }),
    ],
  },
  {
    name: 'Growth',
    minAmount: 250_001,
    maxAmount: 2_000_000,
    options: [option({ roiPercent: 6 })],
  },
  {
    name: 'Premier',
    minAmount: 2_000_001,
    maxAmount: null,
    options: [option({ roiPercent: 8 })],
  },
];

const codes = (issues: ReturnType<typeof validateTierLadder>): LadderIssueCode[] =>
  issues.map((issue) => issue.code);

// ---------------------------------------------------------------------------

describe('annualisedRoi', () => {
  /**
   * Simple, not compounding. These are declared returns paid out as they are
   * earned, not interest left to roll up, so 4% a month is 48% a year.
   */
  it('scales a monthly rate by twelve', () => {
    expect(annualisedRoi(4, 'MONTHLY')).toBe(48);
  });

  it('scales a quarterly rate by four', () => {
    expect(annualisedRoi(2.5, 'QUARTERLY')).toBe(10);
  });

  it('leaves an annual rate alone', () => {
    expect(annualisedRoi(10, 'ANNUAL')).toBe(10);
  });

  /**
   * The reason basis points exist. 0.83 × 12 is 9.959999999999999 in floating
   * point, which would fail a 10% cap by a rounding error nobody can see.
   */
  it('compares cleanly in basis points where the float does not', () => {
    expect(annualisedRoi(0.83, 'MONTHLY')).not.toBe(9.96);
    expect(annualisedBasisPoints(0.83, 'MONTHLY')).toBe(996);
    expect(annualisedBasisPoints(10, 'ANNUAL')).toBe(1000);
  });
});

describe('findTierIndex', () => {
  const bounds = [
    { minAmount: 50_000, maxAmount: 250_000 },
    { minAmount: 250_001, maxAmount: 2_000_000 },
    { minAmount: 2_000_001, maxAmount: null },
  ];

  it('matches the bottom of a tier', () => {
    expect(findTierIndex(50_000, bounds)).toBe(0);
    expect(findTierIndex(250_001, bounds)).toBe(1);
  });

  it('matches the top of a tier', () => {
    expect(findTierIndex(250_000, bounds)).toBe(0);
    expect(findTierIndex(2_000_000, bounds)).toBe(1);
  });

  it('puts anything large in the open-ended top tier', () => {
    expect(findTierIndex(90_000_000, bounds)).toBe(2);
  });

  /**
   * The case the "last floor at or below the amount" approach exists for.
   *
   * Tiers are written inclusively — 250,000 then 250,001 — so a range test on
   * the ceilings would drop anything in between. Matching on floors alone
   * cannot leave a crack.
   */
  it('has somewhere to put an amount that falls between two written bounds', () => {
    expect(findTierIndex(250_000.5, bounds)).toBe(0);
    expect(findTierIndex(2_000_000.75, bounds)).toBe(1);
  });

  it('refuses an amount below the smallest tier', () => {
    expect(findTierIndex(49_999, bounds)).toBe(-1);
    expect(findTierIndex(0, bounds)).toBe(-1);
  });

  it('returns -1 rather than throwing on an empty ladder', () => {
    expect(findTierIndex(100_000, [])).toBe(-1);
  });
});

describe('validateTierLadder', () => {
  it('passes a sound ladder', () => {
    expect(validateTierLadder(soundLadder, context)).toEqual([]);
    expect(isLadderValid(soundLadder, context)).toBe(true);
  });

  it('refuses an empty ladder, and says only that', () => {
    expect(codes(validateTierLadder([], context))).toEqual(['no_tiers']);
  });

  /**
   * Every problem at once, not the first one. An administrator should be able
   * to fix a ladder in one pass rather than discovering the next fault after
   * each save.
   */
  it('reports every problem in one pass', () => {
    const broken: TierDraft[] = [
      { name: 'One', minAmount: 50_000, maxAmount: 250_000, options: [] },
      { name: 'Two', minAmount: 900_000, maxAmount: null, options: [option({ roiPercent: 99 })] },
    ];

    const found = codes(validateTierLadder(broken, context));

    expect(found).toContain('no_options');
    expect(found).toContain('gap');
    expect(found).toContain('roi_above_cap');
    expect(found.length).toBeGreaterThanOrEqual(3);
  });
});

describe('the ladder must start at the platform minimum', () => {
  it('refuses a ladder starting above it', () => {
    const tiers = [tier({ minAmount: 100_000 })];

    expect(codes(validateTierLadder(tiers, context))).toContain('wrong_start');
  });

  it('refuses a ladder starting below it', () => {
    const tiers = [tier({ minAmount: 1_000 })];

    expect(codes(validateTierLadder(tiers, context))).toContain('wrong_start');
  });

  it('points at the field so the form can highlight it', () => {
    const issue = validateTierLadder([tier({ minAmount: 100_000 })], context).find(
      (item) => item.code === 'wrong_start',
    );

    expect(issue).toMatchObject({ tierIndex: 0, field: 'minAmount' });
    expect(issue?.values).toMatchObject({ expected: 50_000, actual: 100_000 });
  });
});

describe('tiers must be contiguous', () => {
  /**
   * The exact shape reported in the Sprint 4 brief: a ladder ending one tier
   * at 2,000,000 and starting the next at 2,500,000, leaving half a million
   * that matches nothing.
   */
  it('refuses the gap the brief describes', () => {
    const tiers: TierDraft[] = [
      tier({ minAmount: 50_000, maxAmount: 2_000_000 }),
      tier({ minAmount: 2_500_000, maxAmount: null }),
    ];

    const issue = validateTierLadder(tiers, context).find((item) => item.code === 'gap');

    expect(issue).toBeDefined();
    expect(issue?.values).toMatchObject({ gapFrom: 2_000_001, gapTo: 2_499_999 });
  });

  it('accepts the same ladder once the next tier starts one above', () => {
    const tiers: TierDraft[] = [
      tier({ minAmount: 50_000, maxAmount: 2_000_000 }),
      tier({ minAmount: 2_000_001, maxAmount: null }),
    ];

    expect(codes(validateTierLadder(tiers, context))).not.toContain('gap');
  });

  it('refuses two tiers that overlap', () => {
    const tiers: TierDraft[] = [
      tier({ minAmount: 50_000, maxAmount: 250_000 }),
      tier({ minAmount: 200_000, maxAmount: null }),
    ];

    expect(codes(validateTierLadder(tiers, context))).toContain('overlap');
  });

  it('refuses two tiers that touch on the same number', () => {
    const tiers: TierDraft[] = [
      tier({ minAmount: 50_000, maxAmount: 250_000 }),
      tier({ minAmount: 250_000, maxAmount: null }),
    ];

    expect(codes(validateTierLadder(tiers, context))).toContain('overlap');
  });

  it('refuses a tier that ends where it starts', () => {
    const tiers: TierDraft[] = [
      tier({ minAmount: 50_000, maxAmount: 50_000 }),
      tier({ minAmount: 50_001, maxAmount: null }),
    ];

    expect(codes(validateTierLadder(tiers, context))).toContain('inverted_range');
  });
});

describe('only the top tier is open-ended', () => {
  it('refuses a highest tier with a ceiling, so no amount is unmatched', () => {
    const tiers = [tier({ minAmount: 50_000, maxAmount: 250_000 })];

    expect(codes(validateTierLadder(tiers, context))).toContain('bounded_top');
  });

  it('refuses an open-ended tier in the middle', () => {
    const tiers: TierDraft[] = [
      tier({ minAmount: 50_000, maxAmount: null }),
      tier({ minAmount: 250_001, maxAmount: null }),
    ];

    expect(codes(validateTierLadder(tiers, context))).toContain('unbounded_middle');
  });

  it('accepts a single open-ended tier as a whole ladder', () => {
    expect(validateTierLadder([tier({ minAmount: 50_000, maxAmount: null })], context)).toEqual([]);
  });
});

describe('each tier must offer something', () => {
  it('refuses a tier with no options', () => {
    expect(codes(validateTierLadder([tier({ options: [] })], context))).toContain('no_options');
  });

  it('refuses two options of the same mode', () => {
    const tiers = [tier({ options: [option(), option({ roiPercent: 5 })] })];

    expect(codes(validateTierLadder(tiers, context))).toContain('duplicate_mode');
  });

  it('accepts one locked and one unlocked option', () => {
    const tiers = [
      tier({
        options: [option(), option({ mode: 'UNLOCKED', minTermMonths: null, maxTermMonths: null })],
      }),
    ];

    expect(validateTierLadder(tiers, context)).toEqual([]);
  });
});

describe('the ROI cap', () => {
  it('accepts a rate exactly at the cap', () => {
    const tiers = [tier({ options: [option({ roiPercent: 10 })] })];

    expect(codes(validateTierLadder(tiers, context))).not.toContain('roi_above_cap');
  });

  it('refuses a rate above it', () => {
    const tiers = [tier({ options: [option({ roiPercent: 10.01 })] })];

    expect(codes(validateTierLadder(tiers, context))).toContain('roi_above_cap');
  });

  /**
   * The cap and the ladder need not be quoted over the same period, so both
   * are put on a yearly footing first. 1% a month is 12% a year, which a 10%
   * yearly cap refuses however small the monthly figure looks.
   */
  it('compares across different periods rather than the bare numbers', () => {
    const annualCap: LadderContext = { ...context, maxRoiPercent: 10, maxRoiBasis: 'ANNUAL' };
    const tiers = [tier({ options: [option({ roiPercent: 1 })] })];

    expect(codes(validateTierLadder(tiers, annualCap))).toContain('roi_above_cap');
  });

  it('accepts a monthly rate that stays under a yearly cap', () => {
    const annualCap: LadderContext = { ...context, maxRoiPercent: 10, maxRoiBasis: 'ANNUAL' };
    const tiers = [tier({ options: [option({ roiPercent: 0.83 })] })];

    expect(codes(validateTierLadder(tiers, annualCap))).not.toContain('roi_above_cap');
  });

  it('refuses a return of zero or less', () => {
    expect(
      codes(validateTierLadder([tier({ options: [option({ roiPercent: 0 })] })], context)),
    ).toContain('roi_not_positive');
    expect(
      codes(validateTierLadder([tier({ options: [option({ roiPercent: -1 })] })], context)),
    ).toContain('roi_not_positive');
  });
});

describe('terms and notice', () => {
  it('refuses a locked option with no term, because that is not locked', () => {
    const tiers = [tier({ options: [option({ minTermMonths: null })] })];

    expect(codes(validateTierLadder(tiers, context))).toContain('locked_without_term');
  });

  it('allows an unlocked option to be open-ended', () => {
    const tiers = [
      tier({ options: [option({ mode: 'UNLOCKED', minTermMonths: null, maxTermMonths: null })] }),
    ];

    expect(validateTierLadder(tiers, context)).toEqual([]);
  });

  it('refuses a maximum term shorter than the minimum', () => {
    const tiers = [tier({ options: [option({ minTermMonths: 24, maxTermMonths: 12 })] })];

    expect(codes(validateTierLadder(tiers, context))).toContain('inverted_term');
  });

  it('accepts a single fixed term', () => {
    const tiers = [tier({ options: [option({ minTermMonths: 12, maxTermMonths: 12 })] })];

    expect(validateTierLadder(tiers, context)).toEqual([]);
  });

  it('accepts no notice period at all', () => {
    const tiers = [tier({ options: [option({ noticePeriodDays: 0 })] })];

    expect(validateTierLadder(tiers, context)).toEqual([]);
  });

  it('refuses a negative or absurd notice period', () => {
    expect(
      codes(validateTierLadder([tier({ options: [option({ noticePeriodDays: -1 })] })], context)),
    ).toContain('notice_out_of_range');
    expect(
      codes(validateTierLadder([tier({ options: [option({ noticePeriodDays: 400 })] })], context)),
    ).toContain('notice_out_of_range');
  });
});
