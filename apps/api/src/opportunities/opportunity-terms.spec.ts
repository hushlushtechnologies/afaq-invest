import { describe, expect, it } from 'vitest';
import { termsOf } from './opportunities.service.js';

/**
 * The pinned ladder, as the cards and headers show it.
 *
 * "From AED 25,000, up to 10% a month" is the line an investor reads first,
 * so both numbers have to come from the ladder the raise was actually pinned
 * to — and from the options that are actually on offer.
 */

const option = (mode: string, roiPercent: string, isEnabled = true) => ({
  mode,
  roiPercent,
  isEnabled,
});

const LADDER = {
  id: 'r-1',
  name: 'Platform rates',
  version: 3,
  scope: 'GLOBAL',
  roiBasis: 'MONTHLY',
  // Decimals arrive from Prisma as objects that stringify; strings stand in.
  tiers: [
    { minAmount: '250001', options: [option('LOCKED', '5'), option('UNLOCKED', '4')] },
    { minAmount: '25000', options: [option('LOCKED', '4'), option('UNLOCKED', '3')] },
    { minAmount: '2000001', options: [option('LOCKED', '10'), option('UNLOCKED', '9')] },
  ],
};

describe('the terms a raise was pinned to', () => {
  it('names the exact version, so the card can say which rules priced it', () => {
    expect(termsOf(LADDER)).toMatchObject({
      ruleSetId: 'r-1',
      ruleSetName: 'Platform rates',
      ruleSetVersion: 3,
      scope: 'GLOBAL',
      roiBasis: 'MONTHLY',
    });
  });

  it('takes the minimum from the lowest floor, whatever order the tiers come in', () => {
    expect(termsOf(LADDER).minimumInvestment).toBe(25_000);
  });

  it('reports the best rate on offer, with the mode that earns it', () => {
    expect(termsOf(LADDER)).toMatchObject({ bestRoiPercent: 10, bestRoiMode: 'LOCKED' });
  });

  /**
   * A switched-off option is not on offer. Advertising its rate would be
   * promising something nobody can buy.
   */
  it('ignores options that are switched off', () => {
    const switchedOff = {
      ...LADDER,
      tiers: [
        { minAmount: '25000', options: [option('LOCKED', '4'), option('UNLOCKED', '3')] },
        { minAmount: '2000001', options: [option('LOCKED', '10', false), option('UNLOCKED', '9')] },
      ],
    };

    expect(termsOf(switchedOff)).toMatchObject({ bestRoiPercent: 9, bestRoiMode: 'UNLOCKED' });
  });

  it('shows zero rather than inventing a figure for a ladder with nothing on offer', () => {
    const nothing = { ...LADDER, tiers: [] };

    expect(termsOf(nothing)).toMatchObject({ minimumInvestment: 0, bestRoiPercent: 0 });
  });
});
