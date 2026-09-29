/**
 * The starter investment configuration.
 *
 * Everything here is a placeholder that an administrator replaces from
 * Administration → Investment Rules. It exists so the platform has a valid
 * ladder on first run rather than an empty one, not because these are Afaq's
 * final numbers — they are not, and nothing in the code depends on them.
 *
 * Two rules the seed keeps, for the reason described in seed.ts:
 *
 *   - the settings row is created if missing and then left alone
 *   - the starter ladder is written only when no rule set exists at all
 *
 * So editing a rate in the Admin Portal and re-running the seed will not undo
 * the edit, and a second run will not stack up duplicate ladders.
 *
 * The ladder below is checked by `validateTierLadder` before anything is
 * written. If a change here leaves a gap, an overlap or a rate above the cap,
 * the seed stops and says which tier is wrong — the same check the Admin form
 * and the API run.
 */

import type { PayoutFrequency, RoiBasis, TierDraft } from '@afaq/types';

// ===========================================================================
// PLATFORM SETTINGS
// ===========================================================================

export interface SeedInvestmentSettings {
  currency: string;
  minimumInvestment: number;
  maxRoiPercent: number;
  maxRoiBasis: RoiBasis;
  defaultNoticePeriodDays: number;
  requireStepUpToPublish: boolean;
}

export const SEED_INVESTMENT_SETTINGS: SeedInvestmentSettings = {
  currency: 'AED',

  /// The ladder must start here, and no investment may be smaller.
  minimumInvestment: 25_000,

  /// The ceiling on any tier's return. Quoted over the basis below, and
  /// compared against a tier's rate after both are put on a yearly footing.
  maxRoiPercent: 10,
  maxRoiBasis: 'MONTHLY',

  defaultNoticePeriodDays: 90,

  /// Publishing a ladder asks the administrator for their own password.
  requireStepUpToPublish: true,
};

// ===========================================================================
// THE STARTER LADDER
// ===========================================================================

/** The period every rate below is quoted over. One dropdown changes it. */
export const SEED_ROI_BASIS: RoiBasis = 'MONTHLY';

export const SEED_RULE_SET_NAME = 'Starter ladder';

const MONTHLY: PayoutFrequency = 'MONTHLY';

/**
 * A tier, in the shape `validateTierLadder` checks, plus its name.
 *
 * Ranges are written the way people say them — 250,000 then 250,001 — and the
 * engine matches on the floors, so the line is continuous even though the
 * written bounds are one apart.
 */
export const SEED_TIERS: readonly TierDraft[] = [
  {
    name: 'Tier 1',
    minAmount: 25_000,
    maxAmount: 250_000,
    options: [
      {
        mode: 'LOCKED',
        roiPercent: 4,
        payoutFrequency: MONTHLY,
        minTermMonths: 12,
        maxTermMonths: 24,
        // Locked money is not withdrawable early, so there is no notice to
        // give. Notice belongs to the unlocked option below.
        noticePeriodDays: 0,
        earnsDuringNotice: false,
      },
      {
        mode: 'UNLOCKED',
        roiPercent: 3,
        payoutFrequency: MONTHLY,
        // Open-ended: the investor leaves when they choose, on notice.
        minTermMonths: null,
        maxTermMonths: null,
        noticePeriodDays: 90,
        // Notice is counted from the day it is given and earns nothing.
        earnsDuringNotice: false,
      },
    ],
  },
  {
    name: 'Tier 2',
    minAmount: 250_001,
    maxAmount: 500_000,
    options: [
      {
        mode: 'LOCKED',
        roiPercent: 5,
        payoutFrequency: MONTHLY,
        minTermMonths: 12,
        maxTermMonths: 24,
        noticePeriodDays: 0,
        earnsDuringNotice: false,
      },
      {
        mode: 'UNLOCKED',
        roiPercent: 4,
        payoutFrequency: MONTHLY,
        minTermMonths: null,
        maxTermMonths: null,
        noticePeriodDays: 90,
        earnsDuringNotice: false,
      },
    ],
  },
  {
    name: 'Tier 3',
    minAmount: 500_001,
    maxAmount: 1_000_000,
    options: [
      {
        mode: 'LOCKED',
        roiPercent: 6,
        payoutFrequency: MONTHLY,
        minTermMonths: 12,
        maxTermMonths: 24,
        noticePeriodDays: 0,
        earnsDuringNotice: false,
      },
      {
        mode: 'UNLOCKED',
        roiPercent: 5,
        payoutFrequency: MONTHLY,
        minTermMonths: null,
        maxTermMonths: null,
        noticePeriodDays: 90,
        earnsDuringNotice: false,
      },
    ],
  },
  {
    name: 'Tier 4',
    minAmount: 1_000_001,
    maxAmount: 2_000_000,
    options: [
      {
        mode: 'LOCKED',
        roiPercent: 8,
        payoutFrequency: MONTHLY,
        minTermMonths: 12,
        maxTermMonths: 24,
        noticePeriodDays: 0,
        earnsDuringNotice: false,
      },
      {
        mode: 'UNLOCKED',
        roiPercent: 7,
        payoutFrequency: MONTHLY,
        minTermMonths: null,
        maxTermMonths: null,
        noticePeriodDays: 90,
        earnsDuringNotice: false,
      },
    ],
  },
  {
    /**
     * Open-ended, and it must be: an amount above the highest tier has to
     * match something. This is also where the gap in the original plan was
     * closed — it began at 2,500,000, leaving half a million that matched no
     * tier at all.
     */
    name: 'Tier 5',
    minAmount: 2_000_001,
    maxAmount: null,
    options: [
      {
        mode: 'LOCKED',
        roiPercent: 10,
        payoutFrequency: MONTHLY,
        minTermMonths: 12,
        maxTermMonths: 24,
        noticePeriodDays: 0,
        earnsDuringNotice: false,
      },
      {
        mode: 'UNLOCKED',
        roiPercent: 9,
        payoutFrequency: MONTHLY,
        minTermMonths: null,
        maxTermMonths: null,
        noticePeriodDays: 90,
        earnsDuringNotice: false,
      },
    ],
  },
];
