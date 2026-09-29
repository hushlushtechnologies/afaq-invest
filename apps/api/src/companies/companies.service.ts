import { Injectable, NotFoundException } from '@nestjs/common';
import {
  acceptsInvestment,
  type CompanyDetail,
  type CompanyListItem,
  type CompanyStatus,
  type CompanySummary,
  type CompanyType,
  type CompanyVerification,
  type Paginated,
} from '@afaq/types';
import { PrismaService } from '../prisma/prisma.service.js';
import { assertAcceptsInvestment, type InvestmentTarget } from './company-policy.js';
import type { ListCompaniesDto } from './dto/list-companies.dto.js';

const DEFAULT_PAGE_SIZE = 25;

/** The database shape this service reads, written out rather than inferred. */
interface CompanyRow {
  id: string;
  slug: string;
  name: string;
  legalName: string | null;
  type: string;
  status: string;
  verification: string;
  sector: string;
  description: string | null;
  logoUrl: string | null;
  coverImageUrl: string | null;
  website: string | null;
  contactEmail: string | null;
  contactPhone: string | null;
  isFeatured: boolean;
  displayOrder: number;
  createdAt: Date;
  updatedAt: Date;
}

/** Only what the list needs. */
const LIST_SELECT = {
  id: true,
  slug: true,
  name: true,
  type: true,
  status: true,
  verification: true,
  sector: true,
  logoUrl: true,
  isFeatured: true,
  displayOrder: true,
  updatedAt: true,
} as const;

/** Everything the detail page shows. */
const DETAIL_SELECT = {
  ...LIST_SELECT,
  legalName: true,
  description: true,
  coverImageUrl: true,
  website: true,
  contactEmail: true,
  contactPhone: true,
  createdAt: true,
} as const;

/**
 * Reading companies. Nothing here changes anything — the write side lives in
 * CompaniesManagementService, so the two permissions guard two separate files.
 */
@Injectable()
export class CompaniesService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * The company list, narrowed and paged.
   *
   * Always paged, like the staff directory: the nine will become ninety once
   * partners arrive, and nobody notices an unbounded query until it hurts.
   */
  async list(query: ListCompaniesDto): Promise<Paginated<CompanyListItem>> {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? DEFAULT_PAGE_SIZE;

    const where = {
      ...(query.type ? { type: query.type } : {}),
      ...(query.status ? { status: query.status } : {}),
      ...(query.verification ? { verification: query.verification } : {}),
      ...(query.sector ? { sector: query.sector } : {}),
      ...(query.featuredOnly ? { isFeatured: true } : {}),
      ...(query.search
        ? {
            OR: [
              { name: { contains: query.search, mode: 'insensitive' as const } },
              { legalName: { contains: query.search, mode: 'insensitive' as const } },
              { sector: { contains: query.search, mode: 'insensitive' as const } },
            ],
          }
        : {}),
    };

    const sortBy = query.sortBy ?? 'displayOrder';
    const sortDirection = query.sortDirection ?? 'asc';

    // Counted and fetched together, so the total and the rows cannot disagree
    // if a company is added in between.
    const [total, rows] = await this.prisma.db.$transaction([
      this.prisma.db.company.count({ where }),
      this.prisma.db.company.findMany({
        where,
        orderBy: orderFor(sortBy, sortDirection),
        skip: (page - 1) * pageSize,
        take: pageSize,
        select: LIST_SELECT,
      }),
    ]);

    return {
      items: (rows as CompanyRow[]).map(toListItem),
      total,
      page,
      pageSize,
    };
  }

  async findOne(id: string): Promise<CompanyDetail> {
    const row: CompanyRow | null = await this.prisma.db.company.findUnique({
      where: { id },
      select: DETAIL_SELECT,
    });

    return toDetail(requireRow(row));
  }

  /** By slug, for the investor-facing marketplace later on. */
  async findBySlug(slug: string): Promise<CompanyDetail> {
    const row: CompanyRow | null = await this.prisma.db.company.findUnique({
      where: { slug },
      select: DETAIL_SELECT,
    });

    return toDetail(requireRow(row));
  }

  /**
   * Confirms a company may take money, or refuses.
   *
   * The gate for everything financial that comes later: publishing an
   * opportunity, accepting an investment request, taking a payment. Those
   * phases call this rather than reading `status` themselves, so the rule has
   * one implementation and inactive companies cannot quietly become investment
   * destinations through a route nobody thought to check.
   *
   * Returns the company so the caller does not fetch it twice.
   */
  async requireInvestable(companyId: string): Promise<InvestmentTarget & { id: string }> {
    const row: (InvestmentTarget & { id: string }) | null = await this.prisma.db.company.findUnique(
      {
        where: { id: companyId },
        select: { id: true, name: true, type: true, status: true, verification: true },
      },
    );

    if (!row) {
      throw new NotFoundException({
        reason: 'not_found',
        message: 'That company no longer exists.',
      });
    }

    assertAcceptsInvestment(row);

    return row;
  }

  /**
   * The dashboard's counts.
   *
   * Counted in the database rather than by loading rows and counting in
   * JavaScript, and only things that actually exist are counted — no invented
   * figures.
   */
  async summary(): Promise<CompanySummary> {
    const [total, active, featured, internal, thirdParty, awaitingVerification] =
      await this.prisma.db.$transaction([
        this.prisma.db.company.count(),
        this.prisma.db.company.count({ where: { status: 'ACTIVE' } }),
        this.prisma.db.company.count({ where: { isFeatured: true, status: 'ACTIVE' } }),
        this.prisma.db.company.count({ where: { type: 'INTERNAL' } }),
        this.prisma.db.company.count({ where: { type: 'THIRD_PARTY' } }),
        this.prisma.db.company.count({
          where: { type: 'THIRD_PARTY', verification: { in: ['PENDING', 'UNDER_REVIEW'] } },
        }),
      ]);

    return { total, active, featured, internal, thirdParty, awaitingVerification };
  }

  /**
   * The distinct sectors in use, for the list's filter.
   *
   * Read from the companies themselves rather than a fixed list, so a sector
   * added by an administrator appears in the filter without a deployment.
   */
  async sectors(): Promise<string[]> {
    const rows: Array<{ sector: string }> = await this.prisma.db.company.findMany({
      distinct: ['sector'],
      orderBy: { sector: 'asc' },
      select: { sector: true },
    });

    return rows.map((row) => row.sector);
  }
}

function requireRow(row: CompanyRow | null): CompanyRow {
  if (!row) {
    throw new NotFoundException({
      reason: 'not_found',
      message: 'That company no longer exists.',
    });
  }

  return row;
}

/**
 * How the rows come back.
 *
 * On the natural order — displayOrder — featured companies come first, because
 * that is what the marketplace means by featured. On any other sort the person
 * asked for something specific (by name, by sector) and promoting the featured
 * ones would fight the sort they chose.
 */
function orderFor(
  sortBy: string,
  direction: 'asc' | 'desc',
): Array<Record<string, 'asc' | 'desc'>> {
  if (sortBy === 'displayOrder') {
    return [{ isFeatured: 'desc' }, { displayOrder: direction }, { name: 'asc' }];
  }

  return [{ [sortBy]: direction }, { name: 'asc' }];
}

function toListItem(row: CompanyRow): CompanyListItem {
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    type: row.type as CompanyType,
    status: row.status as CompanyStatus,
    verification: row.verification as CompanyVerification,
    sector: row.sector,
    logoUrl: row.logoUrl,
    isFeatured: row.isFeatured,
    displayOrder: row.displayOrder,
    updatedAt: row.updatedAt.toISOString(),
  };
}

function toDetail(row: CompanyRow): CompanyDetail {
  const item = toListItem(row);

  return {
    ...item,
    legalName: row.legalName,
    description: row.description,
    coverImageUrl: row.coverImageUrl,
    website: row.website,
    contactEmail: row.contactEmail,
    contactPhone: row.contactPhone,
    // Answered once, here, so no caller re-derives it and gets it wrong.
    acceptsInvestment: acceptsInvestment({
      type: item.type,
      status: item.status,
      verification: item.verification,
    }),
    createdAt: row.createdAt.toISOString(),
  };
}
