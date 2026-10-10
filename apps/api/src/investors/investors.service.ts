import { Injectable } from '@nestjs/common';

import {
  investorEligibility,
  investorReference,
  kycRenewalInProgress,
  kycStanding,
  parseInvestorReference,
  type InvestorDetail,
  type InvestorListItem,
  type InvestorSortField,
  type InvestorSource,
  type InvestorStatus,
  type InvestorSummary,
  type InvestorType,
  type KycSubmissionStatus,
  type KycSubmissionSummary,
  type Paginated,
  type RiskRating,
  type SortDirection,
  type StoredKycStanding,
} from '@afaq/types';

import { PrismaService } from '../prisma/prisma.service.js';

import type { ListInvestorsDto } from './dto/list-investors.dto.js';

import { investorNotFound, standingWhere } from './investor-policy.js';

const DEFAULT_PAGE_SIZE = 25;

/** "Expiring soon" on the dashboard: approvals ending within this many days. */

export const EXPIRING_SOON_DAYS = 30;

const DAY_MS = 24 * 60 * 60 * 1000;

/** The database shapes this service reads, written out rather than inferred. */

interface InvestorRow {
  id: string;

  number: number;

  type: string;

  source: string;

  displayName: string;

  email: string;

  phone: string | null;

  countryOfResidence: string | null;

  status: string;

  kycStatus: string;

  riskRating: string | null;

  kycExpiresAt: Date | null;

  createdAt: Date;

  lastLoginAt: Date | null;
}

interface SubmissionRow {
  id: string;

  status: string;

  investorType: string;

  riskRating: string | null;

  submittedAt: Date | null;

  submittedByStaffId: string | null;

  verifiedAt: Date | null;

  decidedAt: Date | null;

  createdAt: Date;

  updatedAt: Date;

  _count: { documents: number };
}

interface InvestorDetailRow extends InvestorRow {
  authUserId: string | null;

  preferredLocale: string;

  invitedAt: Date | null;

  invitationExpiresAt: Date | null;

  activatedAt: Date | null;

  closedAt: Date | null;

  kycApprovedAt: Date | null;

  updatedAt: Date;

  invitedBy: { fullName: string } | null;

  kycSubmissions: SubmissionRow[];

  _count: { kycSubmissions: number };
}

/** Only what the list needs. */

const LIST_SELECT = {
  id: true,

  number: true,

  type: true,

  source: true,

  displayName: true,

  email: true,

  phone: true,

  countryOfResidence: true,

  status: true,

  kycStatus: true,

  riskRating: true,

  kycExpiresAt: true,

  createdAt: true,

  lastLoginAt: true,
} as const;

/** Everything the detail page shows. */

const DETAIL_SELECT = {
  ...LIST_SELECT,

  authUserId: true,

  preferredLocale: true,

  invitedAt: true,

  invitationExpiresAt: true,

  activatedAt: true,

  closedAt: true,

  kycApprovedAt: true,

  updatedAt: true,

  invitedBy: { select: { fullName: true } },

  // The newest submission only; the full history is the KYC screens' job.

  kycSubmissions: {
    orderBy: { createdAt: 'desc' as const },

    take: 1,

    select: {
      id: true,

      status: true,

      investorType: true,

      riskRating: true,

      submittedAt: true,

      submittedByStaffId: true,

      verifiedAt: true,

      decidedAt: true,

      createdAt: true,

      updatedAt: true,

      // Any file staff uploaded makes it a submission staff helped prepare.

      _count: { select: { documents: { where: { uploadedByStaffId: { not: null } } } } },
    },
  },

  // Any submission at all, drafts included: it decides whether the record

  // may be withdrawn outright.

  _count: { select: { kycSubmissions: true } },
} as const;

/**

 * Reading investors. Nothing here changes anything — the write side lives in

 * InvestorsManagementService, so reading an account and closing one are not

 * the same object with the same reach.

 *

 * Every standing is worked out at the moment of the request from the stored

 * status and expiry date, so an approval that ran out overnight reads as

 * EXPIRED this morning without anything having had to run.

 */

@Injectable()
export class InvestorsService {
  constructor(private readonly prisma: PrismaService) {}

  /** The list, narrowed and paged. Always paged: investors only accumulate. */

  async list(
    query: ListInvestorsDto,

    now: Date = new Date(),
  ): Promise<Paginated<InvestorListItem>> {
    const page = query.page ?? 1;

    const pageSize = query.pageSize ?? DEFAULT_PAGE_SIZE;

    // Combined with AND rather than spread together: the search and the

    // standing filter can both need an OR, and a spread would let one

    // silently replace the other.

    const conditions: Record<string, unknown>[] = [];

    if (query.type) conditions.push({ type: query.type });

    if (query.status) conditions.push({ status: query.status });

    if (query.riskRating) conditions.push({ riskRating: query.riskRating });

    if (query.source) conditions.push({ source: query.source });

    if (query.kycStanding) conditions.push(standingWhere(query.kycStanding, now));

    if (query.search) conditions.push(searchWhere(query.search));

    const where = conditions.length > 0 ? { AND: conditions } : {};

    const sortField = query.sortField ?? 'createdAt';

    const sortDirection = query.sortDirection ?? 'desc';

    // Counted and fetched together, so the total and the rows cannot disagree

    // if an investor signs up in between.

    const [total, rows] = await this.prisma.db.$transaction([
      this.prisma.db.investor.count({ where }),

      this.prisma.db.investor.findMany({
        where,

        orderBy: orderFor(sortField, sortDirection),

        skip: (page - 1) * pageSize,

        take: pageSize,

        select: LIST_SELECT,
      }),
    ]);

    return {
      items: (rows as InvestorRow[]).map((row) => toListItem(row, now)),

      total,

      page,

      pageSize,
    };
  }

  async findOne(id: string, now: Date = new Date()): Promise<InvestorDetail> {
    const row: InvestorDetailRow | null = await this.prisma.db.investor.findUnique({
      where: { id },

      select: DETAIL_SELECT,
    });

    if (!row) throw investorNotFound();

    return toDetail(row, now);
  }

  /**

   * The dashboard's counts.

   *

   * Closed accounts are left out of everything except the total: a closed

   * investor's old approval, or a submission nobody will now review, is not

   * work for anyone.

   */

  async summary(now: Date = new Date()): Promise<InvestorSummary> {
    const notClosed = { status: { not: 'CLOSED' as const } };

    const soon = new Date(now.getTime() + EXPIRING_SOON_DAYS * DAY_MS);

    const [total, active, pendingReview, approved, expiringSoon] =
      await this.prisma.db.$transaction([
        this.prisma.db.investor.count(),

        this.prisma.db.investor.count({ where: { status: 'ACTIVE' } }),

        // Counted from the submissions themselves, so a renewal waiting for a

        // decision is counted even while the old approval still runs.

        this.prisma.db.kycSubmission.count({
          where: { status: { in: ['SUBMITTED', 'VERIFIED'] }, investor: notClosed },
        }),

        this.prisma.db.investor.count({
          where: { AND: [notClosed, standingWhere('APPROVED', now)] },
        }),

        this.prisma.db.investor.count({
          where: {
            AND: [
              notClosed,

              { kycStatus: { not: 'REJECTED' } },

              { kycExpiresAt: { gt: now, lte: soon } },
            ],
          },
        }),
      ]);

    return { total, active, pendingReview, approved, expiringSoon };
  }
}

/**

 * Name, email or phone, and the reference number when the text is one.

 *

 * "INV-42" finds investor 42 exactly rather than every phone number with a

 * 42 in it — but still also searches the text, in case somebody's name or

 * address genuinely contains what was typed.

 */

export function searchWhere(search: string): Record<string, unknown> {
  const contains = { contains: search, mode: 'insensitive' as const };

  const number = parseInvestorReference(search);

  return {
    OR: [
      { displayName: contains },

      { email: contains },

      { phone: contains },

      ...(number !== null ? [{ number }] : []),
    ],
  };
}

/**

 * How the rows come back.

 *

 * Every sort ends on the sequence number, so two investors created in the

 * same millisecond, or sharing a name, always come back in the same order —

 * otherwise paging can show one twice and skip another. Never-signed-in

 * investors go last whichever way last sign-in is sorted.

 */

export function orderFor(field: InvestorSortField, direction: SortDirection): object[] {
  const tieBreak = { number: direction };

  switch (field) {
    case 'number':
      return [{ number: direction }];

    case 'lastLoginAt':
      return [{ lastLoginAt: { sort: direction, nulls: 'last' } }, tieBreak];

    case 'displayName':

    case 'createdAt':
      return [{ [field]: direction }, tieBreak];

    default: {
      const unhandled: never = field;

      return unhandled;
    }
  }
}

function iso(date: Date | null): string | null {
  return date === null ? null : date.toISOString();
}

function stored(row: InvestorRow): { kycStatus: StoredKycStanding; kycExpiresAt: Date | null } {
  return { kycStatus: row.kycStatus as StoredKycStanding, kycExpiresAt: row.kycExpiresAt };
}

function toListItem(row: InvestorRow, now: Date): InvestorListItem {
  return {
    id: row.id,

    number: row.number,

    reference: investorReference(row.number),

    type: row.type as InvestorType,

    displayName: row.displayName,

    email: row.email,

    phone: row.phone,

    countryOfResidence: row.countryOfResidence,

    status: row.status as InvestorStatus,

    source: row.source as InvestorSource,

    kycStanding: kycStanding(stored(row), now),

    kycRenewalInProgress: kycRenewalInProgress(stored(row), now),

    riskRating: row.riskRating as RiskRating | null,

    kycExpiresAt: iso(row.kycExpiresAt),

    createdAt: row.createdAt.toISOString(),

    lastLoginAt: iso(row.lastLoginAt),
  };
}

function toSubmissionSummary(row: SubmissionRow): KycSubmissionSummary {
  return {
    id: row.id,

    status: row.status as KycSubmissionStatus,

    investorType: row.investorType as InvestorType,

    riskRating: row.riskRating as RiskRating | null,

    submittedAt: iso(row.submittedAt),

    verifiedAt: iso(row.verifiedAt),

    decidedAt: iso(row.decidedAt),

    preparedByStaff: row.submittedByStaffId !== null || row._count.documents > 0,

    createdAt: row.createdAt.toISOString(),

    updatedAt: row.updatedAt.toISOString(),
  };
}

function toDetail(row: InvestorDetailRow, now: Date): InvestorDetail {
  const status = row.status as InvestorStatus;

  const latest = row.kycSubmissions[0];

  return {
    ...toListItem(row, now),

    // Supabase creates the account when the invitation is sent, but nobody

    // can sign in to it until the invitation is accepted.

    hasLogin: row.authUserId !== null && status !== 'INVITED',

    preferredLocale: row.preferredLocale,

    invitedAt: iso(row.invitedAt),

    invitationExpiresAt: iso(row.invitationExpiresAt),

    invitedByName: row.invitedBy?.fullName ?? null,

    activatedAt: iso(row.activatedAt),

    closedAt: iso(row.closedAt),

    kycApprovedAt: iso(row.kycApprovedAt),

    hasEverSubmittedKyc: row._count.kycSubmissions > 0,

    latestSubmission: latest ? toSubmissionSummary(latest) : null,

    eligibility: investorEligibility({ status, ...stored(row) }, now),

    updatedAt: row.updatedAt.toISOString(),
  };
}
