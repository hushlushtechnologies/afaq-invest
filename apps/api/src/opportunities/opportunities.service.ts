import { Injectable, NotFoundException } from '@nestjs/common';
import {
  fundingPercent,
  type CompanyType,
  type InvestmentMode,
  type OpportunityDetail,
  type OpportunityListItem,
  type OpportunityStatus,
  type OpportunitySummary,
  type OpportunityTerms,
  type Paginated,
  type RoiBasis,
  type RuleSetScope,
} from '@afaq/types';
import { PrismaService } from '../prisma/prisma.service.js';
import type { ListOpportunitiesDto } from './dto/list-opportunities.dto.js';

const DEFAULT_PAGE_SIZE = 25;

/** Raises that are running, for the list's "live only" filter and the counts. */
const LIVE_STATUSES: OpportunityStatus[] = ['OPEN', 'SUSPENDED'];

/**
 * Prisma hands Decimal columns back as a Decimal object, not a number.
 *
 * Converted at this boundary and nowhere else, so nothing downstream has to
 * wonder which it is holding — the same rule as the investment-rules service.
 */
function toNumber(value: unknown): number {
  return typeof value === 'number' ? value : Number(value);
}

/** The database shapes this service reads, written out rather than inferred. */
interface CompanyPart {
  name: string;
  slug: string;
  type: string;
  sector: string;
}

interface OpportunityRow {
  id: string;
  slug: string;
  title: string;
  summary: string | null;
  status: string;
  companyId: string;
  coverImageUrl: string | null;
  targetAmount: unknown;
  committedAmount: unknown;
  opensAt: Date | null;
  closesAt: Date | null;
  isFeatured: boolean;
  displayOrder: number;
  updatedAt: Date;
  company: CompanyPart;
}

interface OptionPart {
  mode: string;
  roiPercent: unknown;
  isEnabled: boolean;
}

interface RuleSetPart {
  id: string;
  name: string;
  version: number;
  scope: string;
  roiBasis: string;
  tiers: Array<{ minAmount: unknown; options: OptionPart[] }>;
}

interface OpportunityDetailRow extends OpportunityRow {
  description: string | null;
  closedAt: Date | null;
  createdAt: Date;
  ruleSet: RuleSetPart | null;
  createdBy: { fullName: string } | null;
  openedBy: { fullName: string } | null;
}

/** Only what the list needs. */
const LIST_SELECT = {
  id: true,
  slug: true,
  title: true,
  summary: true,
  status: true,
  companyId: true,
  coverImageUrl: true,
  targetAmount: true,
  committedAmount: true,
  opensAt: true,
  closesAt: true,
  isFeatured: true,
  displayOrder: true,
  updatedAt: true,
  company: { select: { name: true, slug: true, type: true, sector: true } },
} as const;

/** Everything the detail page shows, including the pinned terms. */
const DETAIL_SELECT = {
  ...LIST_SELECT,
  description: true,
  closedAt: true,
  createdAt: true,
  createdBy: { select: { fullName: true } },
  openedBy: { select: { fullName: true } },
  ruleSet: {
    select: {
      id: true,
      name: true,
      version: true,
      scope: true,
      roiBasis: true,
      tiers: {
        orderBy: { displayOrder: 'asc' as const },
        select: {
          minAmount: true,
          options: { select: { mode: true, roiPercent: true, isEnabled: true } },
        },
      },
    },
  },
} as const;

/**
 * Reading opportunities. Nothing here changes anything — the write side lives
 * in OpportunitiesManagementService, so reading a raise and opening one are
 * not the same object with the same reach.
 */
@Injectable()
export class OpportunitiesService {
  constructor(private readonly prisma: PrismaService) {}

  /** The list, narrowed and paged. Always paged: raises only accumulate. */
  async list(query: ListOpportunitiesDto): Promise<Paginated<OpportunityListItem>> {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? DEFAULT_PAGE_SIZE;

    const company = {
      ...(query.sector ? { sector: query.sector } : {}),
      ...(query.companyType ? { type: query.companyType } : {}),
    };

    const where = {
      ...(query.status ? { status: query.status } : {}),
      // An explicit status wins over the "live only" switch rather than the
      // two being combined into a filter that can match nothing.
      ...(!query.status && query.liveOnly ? { status: { in: LIVE_STATUSES } } : {}),
      ...(query.companyId ? { companyId: query.companyId } : {}),
      ...(Object.keys(company).length > 0 ? { company } : {}),
      ...(query.search
        ? {
            OR: [
              { title: { contains: query.search, mode: 'insensitive' as const } },
              { company: { name: { contains: query.search, mode: 'insensitive' as const } } },
            ],
          }
        : {}),
    };

    const sortField = query.sortField ?? 'displayOrder';
    const sortDirection = query.sortDirection ?? 'asc';

    // Counted and fetched together, so the total and the rows cannot disagree
    // if a raise is created in between.
    const [total, rows] = await this.prisma.db.$transaction([
      this.prisma.db.investmentOpportunity.count({ where }),
      this.prisma.db.investmentOpportunity.findMany({
        where,
        orderBy: orderFor(sortField, sortDirection),
        skip: (page - 1) * pageSize,
        take: pageSize,
        select: LIST_SELECT,
      }),
    ]);

    return {
      items: (rows as OpportunityRow[]).map(toListItem),
      total,
      page,
      pageSize,
    };
  }

  async findOne(id: string): Promise<OpportunityDetail> {
    const row: OpportunityDetailRow | null = await this.prisma.db.investmentOpportunity.findUnique({
      where: { id },
      select: DETAIL_SELECT,
    });

    return toDetail(requireRow(row));
  }

  /** By slug, for the investor-facing marketplace later on. */
  async findBySlug(slug: string): Promise<OpportunityDetail> {
    const row: OpportunityDetailRow | null = await this.prisma.db.investmentOpportunity.findUnique({
      where: { slug },
      select: DETAIL_SELECT,
    });

    return toDetail(requireRow(row));
  }

  /**
   * The dashboard's counts.
   *
   * Counted and summed in the database, and only over what exists. The money
   * figures cover open raises only, because "how much are we raising" means
   * the raises that are actually raising.
   */
  async summary(): Promise<OpportunitySummary> {
    const [total, open, draft, fullyFunded, sums] = await this.prisma.db.$transaction([
      this.prisma.db.investmentOpportunity.count(),
      this.prisma.db.investmentOpportunity.count({ where: { status: 'OPEN' } }),
      this.prisma.db.investmentOpportunity.count({ where: { status: 'DRAFT' } }),
      this.prisma.db.investmentOpportunity.count({ where: { status: 'FULLY_FUNDED' } }),
      this.prisma.db.investmentOpportunity.aggregate({
        where: { status: 'OPEN' },
        _sum: { targetAmount: true, committedAmount: true },
      }),
    ]);

    const totals = sums as { _sum: { targetAmount: unknown; committedAmount: unknown } };

    return {
      total,
      open,
      draft,
      fullyFunded,
      // A sum over no rows is null, which is "nothing", which is zero.
      targetOpen: toNumber(totals._sum.targetAmount ?? 0),
      committedOpen: toNumber(totals._sum.committedAmount ?? 0),
    };
  }
}

function requireRow<T>(row: T | null): T {
  if (!row) {
    throw new NotFoundException({
      reason: 'not_found',
      message: 'That opportunity no longer exists.',
    });
  }

  return row;
}

/**
 * How the rows come back.
 *
 * On the natural order, Afaq's own companies' raises come first — the
 * marketplace rule the whole platform follows — then featured, then the
 * hand-set order. CompanyType sorts INTERNAL before THIRD_PARTY because
 * Postgres orders an enum by its declared order, and the schema declares
 * INTERNAL first.
 *
 * On any other sort the person asked for something specific, and promoting
 * anything would fight the order they chose.
 */
function orderFor(sortField: string, direction: 'asc' | 'desc'): Array<Record<string, unknown>> {
  if (sortField === 'displayOrder') {
    return [
      { company: { type: 'asc' } },
      { isFeatured: 'desc' },
      { displayOrder: direction },
      { title: 'asc' },
    ];
  }

  return [{ [sortField]: direction }, { title: 'asc' }];
}

function toListItem(row: OpportunityRow): OpportunityListItem {
  const targetAmount = toNumber(row.targetAmount);
  const committedAmount = toNumber(row.committedAmount);

  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    summary: row.summary,
    status: row.status as OpportunityStatus,
    companyId: row.companyId,
    companyName: row.company.name,
    companySlug: row.company.slug,
    companyType: row.company.type as CompanyType,
    sector: row.company.sector,
    coverImageUrl: row.coverImageUrl,
    targetAmount,
    committedAmount,
    // Derived once, here, so no caller re-derives it and gets it subtly wrong.
    fundingPercent: fundingPercent({ targetAmount, committedAmount }),
    opensAt: row.opensAt?.toISOString() ?? null,
    closesAt: row.closesAt?.toISOString() ?? null,
    isFeatured: row.isFeatured,
    displayOrder: row.displayOrder,
    updatedAt: row.updatedAt.toISOString(),
  };
}

function toDetail(row: OpportunityDetailRow): OpportunityDetail {
  return {
    ...toListItem(row),
    description: row.description,
    terms: row.ruleSet ? termsOf(row.ruleSet) : null,
    closedAt: row.closedAt?.toISOString() ?? null,
    createdByName: row.createdBy?.fullName ?? null,
    openedByName: row.openedBy?.fullName ?? null,
    createdAt: row.createdAt.toISOString(),
  };
}

/**
 * The pinned ladder, flattened to what a card or a header needs.
 *
 * Exported for its test. The best rate is the highest enabled option's; every
 * option in one ladder is quoted over the same period, so the percentages are
 * directly comparable. A ladder with no enabled options at all reports zero
 * rather than inventing a figure — it cannot have been published that way,
 * and if it somehow was, a visible zero is the honest signal.
 */
export function termsOf(ruleSet: RuleSetPart): OpportunityTerms {
  const enabled = ruleSet.tiers.flatMap((tier) =>
    tier.options.filter((option) => option.isEnabled),
  );

  let best: OptionPart | null = null;
  for (const option of enabled) {
    if (best === null || toNumber(option.roiPercent) > toNumber(best.roiPercent)) best = option;
  }

  const floors = ruleSet.tiers.map((tier) => toNumber(tier.minAmount));

  return {
    ruleSetId: ruleSet.id,
    ruleSetName: ruleSet.name,
    ruleSetVersion: ruleSet.version,
    scope: ruleSet.scope as RuleSetScope,
    roiBasis: ruleSet.roiBasis as RoiBasis,
    minimumInvestment: floors.length > 0 ? Math.min(...floors) : 0,
    bestRoiPercent: best ? toNumber(best.roiPercent) : 0,
    bestRoiMode: (best?.mode ?? 'LOCKED') as InvestmentMode,
  };
}
