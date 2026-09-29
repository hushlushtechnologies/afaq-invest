import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import {
  annualisedRoi,
  findTierIndex,
  type InvestmentMode,
  type InvestmentQuote,
  type InvestmentSettings,
  type InvestmentTier,
  type Paginated,
  type PayoutFrequency,
  type ResolvedInvestmentTerms,
  type RoiBasis,
  type RuleSetDetail,
  type RuleSetListItem,
  type RuleSetScope,
  type RuleSetStatus,
  type TierOption,
} from '@afaq/types';
import { PrismaService } from '../prisma/prisma.service.js';
import type { ListRuleSetsDto, ResolveTermsDto } from './dto/query-rule-sets.dto.js';
import {
  assertTermIsOffered,
  belowMinimum,
  computeQuote,
  GLOBAL_SCOPE_KEY,
} from './investment-rules-policy.js';

const DEFAULT_PAGE_SIZE = 25;

/**
 * Prisma hands Decimal columns back as a Decimal object, not a number.
 *
 * Converted at this boundary and nowhere else, so nothing downstream has to
 * wonder which it is holding. AED amounts at two decimal places are far
 * inside what a double represents exactly, and every figure the business
 * actually pays is computed in integer fils by `computeQuote` regardless.
 */
function toNumber(value: unknown): number {
  return typeof value === 'number' ? value : Number(value);
}

/** The database shapes this service reads, written out rather than inferred. */
interface OptionRow {
  id: string;
  mode: string;
  roiPercent: unknown;
  payoutFrequency: string;
  minTermMonths: number | null;
  maxTermMonths: number | null;
  noticePeriodDays: number;
  earnsDuringNotice: boolean;
  isEnabled: boolean;
}

interface TierRow {
  id: string;
  name: string;
  minAmount: unknown;
  maxAmount: unknown;
  displayOrder: number;
  options: OptionRow[];
}

interface RuleSetRow {
  id: string;
  name: string;
  version: number;
  scope: string;
  companyId: string | null;
  status: string;
  roiBasis: string;
  notes: string | null;
  effectiveFrom: Date | null;
  effectiveTo: Date | null;
  createdById: string | null;
  publishedById: string | null;
  publishedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  company: { name: string } | null;
  createdBy: { fullName: string } | null;
  publishedBy: { fullName: string } | null;
  tiers: TierRow[];
}

/** Tiers in ladder order, and each tier's options in a stable one. */
const LADDER_INCLUDE = {
  company: { select: { name: true } },
  createdBy: { select: { fullName: true } },
  publishedBy: { select: { fullName: true } },
  tiers: {
    orderBy: { displayOrder: 'asc' as const },
    include: { options: { orderBy: { mode: 'asc' as const } } },
  },
} as const;

/**
 * Reading investment rules, and answering what an amount earns.
 *
 * Nothing here changes anything — the write side lives in
 * InvestmentRulesManagementService, so reading the rules and rewriting them
 * are not the same object with the same reach.
 */
@Injectable()
export class InvestmentRulesService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * The platform-wide settings.
   *
   * Created by the seed. If the row is missing the platform has not been
   * seeded, which is a deployment problem rather than something to paper over
   * with defaults that would quietly disagree with the seed's.
   */
  async settings(): Promise<InvestmentSettings> {
    const row = await this.prisma.db.investmentSettings.findUnique({
      where: { id: 'global' },
      select: {
        currency: true,
        minimumInvestment: true,
        maxRoiPercent: true,
        maxRoiBasis: true,
        defaultNoticePeriodDays: true,
        requireStepUpToPublish: true,
        updatedAt: true,
      },
    });

    if (!row) {
      throw new NotFoundException({
        reason: 'not_seeded',
        message: 'Investment settings have not been created yet. Run the database seed.',
      });
    }

    return {
      currency: row.currency,
      minimumInvestment: toNumber(row.minimumInvestment),
      maxRoiPercent: toNumber(row.maxRoiPercent),
      maxRoiBasis: row.maxRoiBasis as RoiBasis,
      defaultNoticePeriodDays: row.defaultNoticePeriodDays,
      requireStepUpToPublish: row.requireStepUpToPublish,
      updatedAt: row.updatedAt.toISOString(),
    };
  }

  /** Rule sets, newest first within each ladder line. */
  async list(query: ListRuleSetsDto): Promise<Paginated<RuleSetListItem>> {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? DEFAULT_PAGE_SIZE;

    const where = {
      ...(query.scope ? { scope: query.scope } : {}),
      ...(query.status ? { status: query.status } : {}),
      ...(query.companyId ? { companyId: query.companyId } : {}),
    };

    // Counted and fetched together, so the total and the rows cannot disagree
    // if one is published in between.
    const [total, rows] = await this.prisma.db.$transaction([
      this.prisma.db.investmentRuleSet.count({ where }),
      this.prisma.db.investmentRuleSet.findMany({
        where,
        // Live first, then drafts, then the archive — which is the order
        // somebody scanning the screen is looking for them in.
        orderBy: [{ status: 'asc' }, { scopeKey: 'asc' }, { version: 'desc' }],
        skip: (page - 1) * pageSize,
        take: pageSize,
        select: {
          id: true,
          name: true,
          version: true,
          scope: true,
          companyId: true,
          status: true,
          roiBasis: true,
          effectiveFrom: true,
          effectiveTo: true,
          updatedAt: true,
          company: { select: { name: true } },
          _count: { select: { tiers: true } },
        },
      }),
    ]);

    interface ListRow {
      id: string;
      name: string;
      version: number;
      scope: string;
      companyId: string | null;
      status: string;
      roiBasis: string;
      effectiveFrom: Date | null;
      effectiveTo: Date | null;
      updatedAt: Date;
      company: { name: string } | null;
      _count: { tiers: number };
    }

    return {
      items: (rows as ListRow[]).map((row) => ({
        id: row.id,
        name: row.name,
        version: row.version,
        scope: row.scope as RuleSetScope,
        companyId: row.companyId,
        companyName: row.company?.name ?? null,
        status: row.status as RuleSetStatus,
        roiBasis: row.roiBasis as RoiBasis,
        tierCount: row._count.tiers,
        effectiveFrom: row.effectiveFrom?.toISOString() ?? null,
        effectiveTo: row.effectiveTo?.toISOString() ?? null,
        updatedAt: row.updatedAt.toISOString(),
      })),
      total,
      page,
      pageSize,
    };
  }

  /** One rule set, with its whole ladder. */
  async findOne(id: string): Promise<RuleSetDetail> {
    const row: RuleSetRow | null = await this.prisma.db.investmentRuleSet.findUnique({
      where: { id },
      include: LADDER_INCLUDE,
    });

    if (!row) {
      throw new NotFoundException({
        reason: 'not_found',
        message: 'That rule set no longer exists.',
      });
    }

    return toDetail(row);
  }

  /**
   * The ladder currently in force for a company.
   *
   * A company's own live ladder if it has one, and the platform-wide one
   * otherwise. Two queries rather than a clever one: the fallback is the
   * whole point and should be visible in the code that does it.
   */
  async activeFor(companyId?: string): Promise<RuleSetDetail> {
    if (companyId) {
      const own: RuleSetRow | null = await this.prisma.db.investmentRuleSet.findUnique({
        where: { activeKey: companyId },
        include: LADDER_INCLUDE,
      });

      if (own) return toDetail(own);
    }

    const global: RuleSetRow | null = await this.prisma.db.investmentRuleSet.findUnique({
      where: { activeKey: GLOBAL_SCOPE_KEY },
      include: LADDER_INCLUDE,
    });

    if (!global) {
      throw new ConflictException({
        reason: 'no_active_ladder',
        message:
          'No investment rules are currently published, so nothing can be priced. Publish a ' +
          'ladder first.',
      });
    }

    return toDetail(global);
  }

  /**
   * What an amount earns: the single answer every portal renders.
   *
   * No screen works any of this out for itself. A tier changing shape, a
   * company getting its own ladder, a mode being switched off — none of it
   * reaches React, because React only ever receives the answer.
   */
  async resolve(query: ResolveTermsDto): Promise<ResolvedInvestmentTerms> {
    const settings = await this.settings();

    if (query.amount < settings.minimumInvestment) {
      throw belowMinimum(query.amount, settings.minimumInvestment, settings.currency);
    }

    const ruleSet = await this.activeFor(query.companyId);

    const index = findTierIndex(query.amount, ruleSet.tiers);

    if (index < 0) {
      // Reachable only if the live ladder starts above the platform minimum,
      // which validation prevents — but an amount with nowhere to go must
      // never be answered with a guess.
      throw belowMinimum(query.amount, ruleSet.tiers[0]?.minAmount ?? 0, settings.currency);
    }

    const tier = ruleSet.tiers[index] as InvestmentTier;
    const option = tier.options.find((item) => item.mode === query.mode && item.isEnabled);

    if (!option) {
      throw new ConflictException({
        reason: 'mode_unavailable',
        mode: query.mode,
        tier: tier.name,
        message: `${tier.name} does not currently offer a ${query.mode.toLowerCase()} option.`,
      });
    }

    return termsFor(ruleSet, tier, option);
  }

  /** The figures behind the answer, computed here and never in a browser. */
  async quote(query: ResolveTermsDto): Promise<InvestmentQuote> {
    const [settings, terms] = await Promise.all([this.settings(), this.resolve(query)]);

    const termMonths = query.termMonths ?? null;
    assertTermIsOffered(termMonths, terms);

    return computeQuote(query.amount, terms, settings.currency, termMonths);
  }
}

// ===========================================================================
// MAPPING
// ===========================================================================

function toOption(row: OptionRow): TierOption {
  return {
    id: row.id,
    mode: row.mode as InvestmentMode,
    roiPercent: toNumber(row.roiPercent),
    payoutFrequency: row.payoutFrequency as PayoutFrequency,
    minTermMonths: row.minTermMonths,
    maxTermMonths: row.maxTermMonths,
    noticePeriodDays: row.noticePeriodDays,
    earnsDuringNotice: row.earnsDuringNotice,
    isEnabled: row.isEnabled,
  };
}

function toTier(row: TierRow): InvestmentTier {
  return {
    id: row.id,
    name: row.name,
    minAmount: toNumber(row.minAmount),
    maxAmount: row.maxAmount === null ? null : toNumber(row.maxAmount),
    displayOrder: row.displayOrder,
    options: row.options.map(toOption),
  };
}

function toDetail(row: RuleSetRow): RuleSetDetail {
  return {
    id: row.id,
    name: row.name,
    version: row.version,
    scope: row.scope as RuleSetScope,
    companyId: row.companyId,
    companyName: row.company?.name ?? null,
    status: row.status as RuleSetStatus,
    roiBasis: row.roiBasis as RoiBasis,
    tierCount: row.tiers.length,
    effectiveFrom: row.effectiveFrom?.toISOString() ?? null,
    effectiveTo: row.effectiveTo?.toISOString() ?? null,
    updatedAt: row.updatedAt.toISOString(),
    notes: row.notes,
    createdById: row.createdById,
    createdByName: row.createdBy?.fullName ?? null,
    publishedById: row.publishedById,
    publishedByName: row.publishedBy?.fullName ?? null,
    publishedAt: row.publishedAt?.toISOString() ?? null,
    tiers: row.tiers.map(toTier),
    createdAt: row.createdAt.toISOString(),
  };
}

/**
 * The resolved answer.
 *
 * The rule set's id and version travel with it deliberately: attached to an
 * investment, this is the record of what that person was actually sold, and
 * it survives every later change to the ladder.
 */
function termsFor(
  ruleSet: RuleSetDetail,
  tier: InvestmentTier,
  option: TierOption,
): ResolvedInvestmentTerms {
  return {
    ruleSetId: ruleSet.id,
    ruleSetName: ruleSet.name,
    ruleSetVersion: ruleSet.version,
    scope: ruleSet.scope,
    companyId: ruleSet.companyId,

    tierId: tier.id,
    tierName: tier.name,
    minAmount: tier.minAmount,
    maxAmount: tier.maxAmount,

    mode: option.mode,
    roiPercent: option.roiPercent,
    roiBasis: ruleSet.roiBasis,
    annualisedRoiPercent: annualisedRoi(option.roiPercent, ruleSet.roiBasis),

    payoutFrequency: option.payoutFrequency,
    minTermMonths: option.minTermMonths,
    maxTermMonths: option.maxTermMonths,
    noticePeriodDays: option.noticePeriodDays,
    earnsDuringNotice: option.earnsDuringNotice,
  };
}
