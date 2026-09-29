/**
 * Companies, as every side of the platform sees them.
 *
 * The string values match the Prisma enums exactly, so the seed, the API and
 * the Admin Portal cannot drift apart about what "VERIFIED" means. This file
 * has no dependencies beyond the other type modules, so anything can import
 * it — including the database seed, which runs before the API exists.
 */

import type { SortDirection } from './staff';

// ===========================================================================
// ENUMS
// ===========================================================================

/**
 * Who owns the company.
 *
 * Afaq's own companies come first in the marketplace and need no vetting;
 * outside partners are held to the verification flow below.
 */
export const COMPANY_TYPES = ['INTERNAL', 'THIRD_PARTY'] as const;
export type CompanyType = (typeof COMPANY_TYPES)[number];

/** Whether the company is trading with us right now. */
export const COMPANY_STATUSES = ['ACTIVE', 'INACTIVE', 'SUSPENDED'] as const;
export type CompanyStatus = (typeof COMPANY_STATUSES)[number];

/**
 * How far an outside company has got through vetting.
 *
 * NOT_REQUIRED is the resting state for Afaq's own companies: the question
 * does not apply to them, which is different from failing to answer it.
 */
export const COMPANY_VERIFICATIONS = [
  'NOT_REQUIRED',
  'PENDING',
  'UNDER_REVIEW',
  'VERIFIED',
  'REJECTED',
] as const;
export type CompanyVerification = (typeof COMPANY_VERIFICATIONS)[number];

// ===========================================================================
// THE ONE RULE WORTH SHARING
// ===========================================================================

/**
 * Whether this company may currently receive investment.
 *
 * The single predicate both portals and the API ask, so "open for investment"
 * means one thing everywhere. Two conditions, and both matter:
 *
 * - it must be trading, and
 * - if it is an outside company, we must have checked it.
 *
 * An Afaq company is NOT_REQUIRED and passes the second test without being
 * "verified"; a third-party company that is merely PENDING does not, however
 * active it looks.
 *
 * Opportunities will add their own conditions on top. This is the floor.
 */
export function acceptsInvestment(company: {
  type: CompanyType;
  status: CompanyStatus;
  verification: CompanyVerification;
}): boolean {
  if (company.status !== 'ACTIVE') return false;
  if (company.type === 'INTERNAL') return true;
  return company.verification === 'VERIFIED';
}

// ===========================================================================
// WHAT THE API RETURNS
// ===========================================================================

/** A company as the Admin list and the marketplace grid show it. */
export interface CompanyListItem {
  id: string;
  slug: string;
  name: string;
  type: CompanyType;
  status: CompanyStatus;
  verification: CompanyVerification;
  sector: string;
  logoUrl: string | null;
  isFeatured: boolean;
  displayOrder: number;
  /** ISO 8601. Serialised as a string so no Date crosses the wire. */
  updatedAt: string;
}

/** Everything on the company detail page. */
export interface CompanyDetail extends CompanyListItem {
  legalName: string | null;
  description: string | null;
  coverImageUrl: string | null;
  website: string | null;
  contactEmail: string | null;
  contactPhone: string | null;
  /** Resolved from `acceptsInvestment` by the API, so nobody re-derives it. */
  acceptsInvestment: boolean;
  createdAt: string;
}

/** The dashboard's company counts. Only what actually exists is counted. */
export interface CompanySummary {
  total: number;
  active: number;
  featured: number;
  internal: number;
  thirdParty: number;
  awaitingVerification: number;
}

// ===========================================================================
// WHAT THE API ACCEPTS
// ===========================================================================

export const COMPANY_SORT_FIELDS = ['displayOrder', 'name', 'sector', 'updatedAt'] as const;
export type CompanySortField = (typeof COMPANY_SORT_FIELDS)[number];

/** Filters and paging for the company list. Every field optional. */
export interface CompanyListQuery {
  /** Matches name, legal name or sector. */
  search?: string;
  type?: CompanyType;
  status?: CompanyStatus;
  verification?: CompanyVerification;
  sector?: string;
  featuredOnly?: boolean;
  page?: number;
  pageSize?: number;
  sortBy?: CompanySortField;
  /** Named to match the staff list, which the Admin Portal already speaks. */
  sortDirection?: SortDirection;
}

/**
 * Creating or editing a company.
 *
 * Neither `slug` nor `verification` appears here on purpose. The slug is
 * derived from the name once, by the API, because a slug that changes breaks
 * saved links. Verification is a decision with its own audited endpoint and
 * its own permission — letting it ride along inside an ordinary edit would
 * mean anyone who can fix a typo can also mark a partner as checked.
 */
export interface CompanyInput {
  name: string;
  legalName?: string | null;
  type: CompanyType;
  sector: string;
  description?: string | null;
  logoUrl?: string | null;
  coverImageUrl?: string | null;
  website?: string | null;
  contactEmail?: string | null;
  contactPhone?: string | null;
  isFeatured?: boolean;
  displayOrder?: number;
}

/** One company's place in a reorder. */
export interface CompanyPosition {
  id: string;
  displayOrder: number;
}
