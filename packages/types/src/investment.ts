/**
 * Investment tiers, rules and configuration, as every side of the platform
 * sees them.
 *
 * This file is the architecture. Three things are kept deliberately separate:
 *
 *   Rule set  — a *version* of a whole ladder. Never edited once live.
 *   Tier      — an amount range inside a rule set. Nothing else.
 *   Option    — how one tier behaves in one mode (locked / unlocked).
 *
 * Plus platform-wide settings, which say what a ladder is allowed to contain.
 *
 * Nothing in here is specific to Afaq's current five tiers, and no percentage,
 * range or period appears anywhere in the Admin, Investor or Partner portals.
 * Screens render what the API resolved; they never decide it.
 *
 * Like `company.ts`, this has no dependencies beyond the other type modules,
 * so the seed, the API and all three portals can import it.
 */

// ===========================================================================
// ENUMS
// ===========================================================================

/** Whether the money is tied up for a fixed term or withdrawable on notice. */
export const INVESTMENT_MODES = ['LOCKED', 'UNLOCKED'] as const;
export type InvestmentMode = (typeof INVESTMENT_MODES)[number];

/**
 * The period a return percentage is quoted over.
 *
 * "4%" means nothing on its own — 4% a month and 4% a year differ by a factor
 * of twelve. Every stored percentage carries the period it is quoted over, so
 * the number can never be read the wrong way round.
 */
export const ROI_BASES = ['MONTHLY', 'QUARTERLY', 'ANNUAL'] as const;
export type RoiBasis = (typeof ROI_BASES)[number];

/** How often the return actually reaches the investor. */
export const PAYOUT_FREQUENCIES = [
  'MONTHLY',
  'QUARTERLY',
  'SEMI_ANNUAL',
  'ANNUAL',
  'ON_MATURITY',
] as const;
export type PayoutFrequency = (typeof PAYOUT_FREQUENCIES)[number];

/**
 * Where a rule set is in its life.
 *
 * DRAFT can be edited freely. ACTIVE is what investors are being sold today
 * and is read-only. ARCHIVED was ACTIVE once; investments sold under it still
 * point at it, which is the whole reason it is kept.
 */
export const RULE_SET_STATUSES = ['DRAFT', 'ACTIVE', 'ARCHIVED'] as const;
export type RuleSetStatus = (typeof RULE_SET_STATUSES)[number];

/** Whether a ladder applies platform-wide or to one company only. */
export const RULE_SET_SCOPES = ['GLOBAL', 'COMPANY'] as const;
export type RuleSetScope = (typeof RULE_SET_SCOPES)[number];

// ===========================================================================
// PERIOD ARITHMETIC
// ===========================================================================

/** How many months each basis covers. */
export const MONTHS_PER_BASIS: Readonly<Record<RoiBasis, number>> = {
  MONTHLY: 1,
  QUARTERLY: 3,
  ANNUAL: 12,
};

/**
 * How many payouts a year each frequency makes.
 *
 * ON_MATURITY is null rather than a number: it does not happen on a cycle at
 * all, it happens once, at the end. Anything dividing by this must handle the
 * null rather than quietly treating it as one payment a year.
 */
export const PAYOUTS_PER_YEAR: Readonly<Record<PayoutFrequency, number | null>> = {
  MONTHLY: 12,
  QUARTERLY: 4,
  SEMI_ANNUAL: 2,
  ANNUAL: 1,
  ON_MATURITY: null,
};

/**
 * The same rate expressed as a yearly percentage.
 *
 * Simple, not compounding: 4% a month is 48% a year, not 60.1%. These are
 * fixed declared returns paid out as they are earned, not interest left to
 * roll up, so simple is the honest conversion.
 *
 * Exists so two rates quoted over different periods can be compared at all —
 * the ROI cap being the case that matters.
 */
export function annualisedRoi(percent: number, basis: RoiBasis): number {
  return percent * (12 / MONTHS_PER_BASIS[basis]);
}

/**
 * An annual rate as an integer count of basis points.
 *
 * Comparisons use this rather than the float, so 0.83% a month does not fail a
 * 10% cap because 9.96 came out as 9.959999999999999.
 */
export function annualisedBasisPoints(percent: number, basis: RoiBasis): number {
  return Math.round(annualisedRoi(percent, basis) * 100);
}

// ===========================================================================
// PLATFORM SETTINGS
// ===========================================================================

/**
 * The values that bound every ladder.
 *
 * One row in the database. Editable from the Admin Portal, because all of it
 * is a business decision that will change.
 */
export interface InvestmentSettings {
  /** ISO 4217. "AED" today; not assumed anywhere in code. */
  currency: string;
  /** Nobody may invest less than this, and every ladder must start here. */
  minimumInvestment: number;
  /** No option's return may exceed this, once both are put on the same basis. */
  maxRoiPercent: number;
  /** The period the cap above is quoted over. */
  maxRoiBasis: RoiBasis;
  /** Offered as the default when a new option is added. Not enforced. */
  defaultNoticePeriodDays: number;
  /**
   * Whether publishing a rule set requires the administrator to re-enter
   * their own password. On by default: these numbers decide what the business
   * owes people.
   */
  requireStepUpToPublish: boolean;
  updatedAt: string;
}

// ===========================================================================
// THE LADDER, AS STORED
// ===========================================================================

/** How one tier behaves in one mode. */
export interface TierOption {
  id: string;
  mode: InvestmentMode;
  /** Quoted over the rule set's `roiBasis`, not over its own. */
  roiPercent: number;
  payoutFrequency: PayoutFrequency;
  /** Null means open-ended, which is the normal shape of an unlocked option. */
  minTermMonths: number | null;
  maxTermMonths: number | null;
  /** Days of warning before money can leave. Zero means none. */
  noticePeriodDays: number;
  /**
   * Whether the investment keeps earning while notice runs.
   *
   * False today, by decision: the notice period is counted from the day notice
   * is given and earns nothing.
   */
  earnsDuringNotice: boolean;
  isEnabled: boolean;
}

/**
 * One amount range.
 *
 * Ranges are written the way people say them — 1,000,001 to 2,000,000 — and
 * matched as one continuous line, so an amount like 2,000,000.50 still lands
 * in a tier instead of falling down the crack between two.
 */
export interface InvestmentTier {
  id: string;
  name: string;
  minAmount: number;
  /** Null on the top tier only, which is always open-ended. */
  maxAmount: number | null;
  displayOrder: number;
  options: TierOption[];
}

/** A rule set in a list: enough to choose one, not enough to price anything. */
export interface RuleSetListItem {
  id: string;
  name: string;
  version: number;
  scope: RuleSetScope;
  /** Set when the scope is COMPANY. */
  companyId: string | null;
  companyName: string | null;
  status: RuleSetStatus;
  roiBasis: RoiBasis;
  tierCount: number;
  effectiveFrom: string | null;
  effectiveTo: string | null;
  updatedAt: string;
}

/** A rule set with its whole ladder. */
export interface RuleSetDetail extends RuleSetListItem {
  notes: string | null;
  createdById: string | null;
  createdByName: string | null;
  publishedById: string | null;
  publishedByName: string | null;
  publishedAt: string | null;
  tiers: InvestmentTier[];
  createdAt: string;
}

// ===========================================================================
// WHAT THE ENGINE ANSWERS
// ===========================================================================

/**
 * The terms an amount earns, resolved.
 *
 * Every screen that shows a rate, a lock period or a notice period renders
 * this. None of them works any of it out. A tier changing shape, a company
 * getting its own ladder, a new mode appearing — none of it reaches React.
 *
 * `ruleSetId` and `ruleSetVersion` travel with it deliberately: when this is
 * attached to an investment, it is the record of what that person was sold.
 */
export interface ResolvedInvestmentTerms {
  ruleSetId: string;
  ruleSetName: string;
  ruleSetVersion: number;
  scope: RuleSetScope;
  companyId: string | null;

  tierId: string;
  tierName: string;
  minAmount: number;
  maxAmount: number | null;

  mode: InvestmentMode;
  roiPercent: number;
  roiBasis: RoiBasis;
  /** The same rate as a yearly figure, so two tiers can be compared. */
  annualisedRoiPercent: number;

  payoutFrequency: PayoutFrequency;
  minTermMonths: number | null;
  maxTermMonths: number | null;
  noticePeriodDays: number;
  earnsDuringNotice: boolean;
}

/**
 * What the investor's calculator shows.
 *
 * Money is computed by the API in whole fils and rounded half-up, never in the
 * browser: two screens must not be able to disagree about what somebody earns.
 */
export interface InvestmentQuote {
  amount: number;
  currency: string;
  terms: ResolvedInvestmentTerms;
  /** One payment. Null when the frequency is ON_MATURITY. */
  returnPerPayout: number | null;
  payoutsPerYear: number | null;
  returnPerYear: number;
  /** Over `termMonths`, when a term was chosen. */
  termMonths: number | null;
  totalReturnOverTerm: number | null;
}

// ===========================================================================
// MATCHING AN AMOUNT TO A TIER
// ===========================================================================

/** The bit of a tier the matcher needs. */
export interface TierBounds {
  minAmount: number;
  maxAmount: number | null;
}

/**
 * Which tier an amount falls in.
 *
 * The last tier whose floor the amount reaches. Written this way rather than
 * as a range test on purpose: a validated ladder is contiguous, so the floors
 * alone define it completely and there is no arithmetic on the ceilings that
 * could leave a crack between two tiers.
 *
 * Returns -1 when the amount is below the smallest tier.
 */
export function findTierIndex(amount: number, tiers: readonly TierBounds[]): number {
  let found = -1;

  for (let index = 0; index < tiers.length; index += 1) {
    const tier = tiers[index];
    if (tier !== undefined && amount >= tier.minAmount) found = index;
  }

  return found;
}

// ===========================================================================
// VALIDATING A LADDER
// ===========================================================================

/**
 * What can be wrong with a ladder.
 *
 * Codes rather than sentences, so the Admin Portal can translate them into
 * Arabic and point at the offending field, and the API can refuse with the
 * same list.
 */
export const LADDER_ISSUE_CODES = [
  'no_tiers',
  'wrong_start',
  'out_of_order',
  'inverted_range',
  'gap',
  'overlap',
  'bounded_top',
  'unbounded_middle',
  'no_options',
  'duplicate_mode',
  'roi_not_positive',
  'roi_above_cap',
  'locked_without_term',
  'inverted_term',
  'notice_out_of_range',
] as const;
export type LadderIssueCode = (typeof LADDER_ISSUE_CODES)[number];

export interface LadderIssue {
  code: LadderIssueCode;
  /** Which tier, when the problem belongs to one. */
  tierIndex?: number;
  /** Which option within that tier. */
  optionIndex?: number;
  /** The form field to highlight. */
  field?: string;
  /** English, for the API's own error text. The portals translate the code. */
  message: string;
  /** Numbers the translated message needs, e.g. the size of a gap. */
  values?: Record<string, string | number>;
}

/** A tier as the admin form holds it, before it has any identifiers. */
export interface TierDraft {
  name: string;
  minAmount: number;
  maxAmount: number | null;
  options: readonly TierOptionDraft[];
}

/** An option as the admin form holds it. */
export interface TierOptionDraft {
  mode: InvestmentMode;
  roiPercent: number;
  payoutFrequency: PayoutFrequency;
  minTermMonths: number | null;
  maxTermMonths: number | null;
  noticePeriodDays: number;
  earnsDuringNotice: boolean;
}

/** Everything needed to judge a ladder. */
export interface LadderContext {
  /** The basis every percentage in this ladder is quoted over. */
  roiBasis: RoiBasis;
  minimumInvestment: number;
  maxRoiPercent: number;
  maxRoiBasis: RoiBasis;
}

/** The longest notice period anyone could sensibly set. */
const MAX_NOTICE_DAYS = 365;

/**
 * The widest a break between two tiers may be and still count as contiguous.
 *
 * Tiers are written inclusively, so a tier ending at 2,000,000 is followed by
 * one starting at 2,000,001 — one apart, not touching. Anything wider is a
 * gap somebody meant to fill.
 */
const CONTIGUITY_TOLERANCE = 1;

/**
 * Every problem with a ladder, in one pass.
 *
 * A pure function, because both sides need the same answer: the Admin Portal
 * calls it as the form is typed so a gap is visible immediately, and the API
 * calls it before saving, because a form is not a security boundary.
 *
 * Returns everything wrong rather than the first thing, so an administrator
 * fixes a ladder once instead of five times.
 */
export function validateTierLadder(
  tiers: readonly TierDraft[],
  context: LadderContext,
): LadderIssue[] {
  const issues: LadderIssue[] = [];

  if (tiers.length === 0) {
    return [
      {
        code: 'no_tiers',
        message: 'A rule set needs at least one tier.',
      },
    ];
  }

  const capBasisPoints = annualisedBasisPoints(context.maxRoiPercent, context.maxRoiBasis);

  // --- the ladder must start at the platform minimum ---------------------
  const first = tiers[0];
  if (first !== undefined && first.minAmount !== context.minimumInvestment) {
    issues.push({
      code: 'wrong_start',
      tierIndex: 0,
      field: 'minAmount',
      message:
        `The first tier must start at the minimum investment of ` +
        `${context.minimumInvestment}, not ${first.minAmount}.`,
      values: { expected: context.minimumInvestment, actual: first.minAmount },
    });
  }

  tiers.forEach((tier, index) => {
    const isLast = index === tiers.length - 1;

    // --- this tier's own range -------------------------------------------
    if (tier.maxAmount !== null && tier.maxAmount <= tier.minAmount) {
      issues.push({
        code: 'inverted_range',
        tierIndex: index,
        field: 'maxAmount',
        message: `Tier ${index + 1} ends at or below where it starts.`,
      });
    }

    if (isLast && tier.maxAmount !== null) {
      issues.push({
        code: 'bounded_top',
        tierIndex: index,
        field: 'maxAmount',
        message:
          'The highest tier must be open-ended, or an investment above it would ' +
          'match nothing at all.',
      });
    }

    if (!isLast && tier.maxAmount === null) {
      issues.push({
        code: 'unbounded_middle',
        tierIndex: index,
        field: 'maxAmount',
        message: `Tier ${index + 1} is open-ended but is not the highest tier.`,
      });
    }

    // --- how it sits against the next one --------------------------------
    const next = tiers[index + 1];
    if (next !== undefined && tier.maxAmount !== null) {
      if (next.minAmount <= tier.maxAmount) {
        issues.push({
          code: 'overlap',
          tierIndex: index + 1,
          field: 'minAmount',
          message:
            `Tier ${index + 2} starts at ${next.minAmount}, which tier ${index + 1} ` +
            `already covers up to ${tier.maxAmount}.`,
          values: { previousMax: tier.maxAmount, nextMin: next.minAmount },
        });
      } else if (next.minAmount - tier.maxAmount > CONTIGUITY_TOLERANCE) {
        issues.push({
          code: 'gap',
          tierIndex: index + 1,
          field: 'minAmount',
          message:
            `Nothing covers ${tier.maxAmount + 1} to ${next.minAmount - 1}. Tier ` +
            `${index + 1} ends at ${tier.maxAmount} and tier ${index + 2} starts at ` +
            `${next.minAmount}.`,
          values: {
            gapFrom: tier.maxAmount + 1,
            gapTo: next.minAmount - 1,
            previousMax: tier.maxAmount,
            nextMin: next.minAmount,
          },
        });
      }
    } else if (next !== undefined && next.minAmount <= tier.minAmount) {
      // Only reachable when this tier is open-ended in the middle, which is
      // already reported above — but ordering is still worth naming.
      issues.push({
        code: 'out_of_order',
        tierIndex: index + 1,
        field: 'minAmount',
        message: `Tier ${index + 2} starts at or below tier ${index + 1}.`,
      });
    }

    // --- its options ------------------------------------------------------
    if (tier.options.length === 0) {
      issues.push({
        code: 'no_options',
        tierIndex: index,
        message: `Tier ${index + 1} offers nothing — add a locked or unlocked option.`,
      });
    }

    const seenModes = new Set<InvestmentMode>();

    tier.options.forEach((option, optionIndex) => {
      if (seenModes.has(option.mode)) {
        issues.push({
          code: 'duplicate_mode',
          tierIndex: index,
          optionIndex,
          field: 'mode',
          message: `Tier ${index + 1} has two ${option.mode.toLowerCase()} options.`,
        });
      }
      seenModes.add(option.mode);

      if (option.roiPercent <= 0) {
        issues.push({
          code: 'roi_not_positive',
          tierIndex: index,
          optionIndex,
          field: 'roiPercent',
          message: `Tier ${index + 1} offers a return of zero or less.`,
        });
      } else if (annualisedBasisPoints(option.roiPercent, context.roiBasis) > capBasisPoints) {
        issues.push({
          code: 'roi_above_cap',
          tierIndex: index,
          optionIndex,
          field: 'roiPercent',
          message:
            `${option.roiPercent}% ${context.roiBasis.toLowerCase()} is above the cap of ` +
            `${context.maxRoiPercent}% ${context.maxRoiBasis.toLowerCase()}.`,
          values: {
            roiPercent: option.roiPercent,
            basis: context.roiBasis,
            capPercent: context.maxRoiPercent,
            capBasis: context.maxRoiBasis,
          },
        });
      }

      if (option.mode === 'LOCKED' && option.minTermMonths === null) {
        issues.push({
          code: 'locked_without_term',
          tierIndex: index,
          optionIndex,
          field: 'minTermMonths',
          message: 'A locked option needs a term — that is what makes it locked.',
        });
      }

      if (
        option.minTermMonths !== null &&
        option.maxTermMonths !== null &&
        option.maxTermMonths < option.minTermMonths
      ) {
        issues.push({
          code: 'inverted_term',
          tierIndex: index,
          optionIndex,
          field: 'maxTermMonths',
          message: 'The longest term is shorter than the shortest one.',
        });
      }

      if (option.noticePeriodDays < 0 || option.noticePeriodDays > MAX_NOTICE_DAYS) {
        issues.push({
          code: 'notice_out_of_range',
          tierIndex: index,
          optionIndex,
          field: 'noticePeriodDays',
          message: `Notice must be between 0 and ${MAX_NOTICE_DAYS} days.`,
        });
      }
    });
  });

  return issues;
}

/** Whether a ladder may be published. */
export function isLadderValid(tiers: readonly TierDraft[], context: LadderContext): boolean {
  return validateTierLadder(tiers, context).length === 0;
}
