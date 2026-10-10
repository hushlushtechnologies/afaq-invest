/**
 * Investors, as every side of the platform sees them.
 *
 * An investor is a person or a company that may put money into an
 * opportunity — once their identity has been checked. This file is the
 * account side: who they are, how they arrived, whether their account is
 * usable, and the one question every other part of the platform asks of
 * them: may this investor invest right now? The identity checks themselves
 * live in ./kyc.
 *
 * Decisions baked in here, because they are expensive to reverse:
 *
 * 1. Two kinds of investor, individual and corporate, from the start. A
 *    corporate investor is checked differently — a trade licence, the people
 *    who sign for it, the people who own it — and bolting that on later would
 *    mean rewriting every table that assumed a person.
 *
 * 2. Investors arrive two ways: they sign up in the Investor Portal, or staff
 *    invite them by email. The record says which, because "who brought this
 *    person in" is a question compliance asks.
 *
 * 3. An investor record is never deleted once it holds anything worth
 *    keeping. UAE anti-money-laundering rules require identity records to be
 *    retained for years after the relationship ends, so an account is
 *    *closed*, not removed. The one exception is an invitation nobody ever
 *    accepted and nothing was ever submitted against — that is a typo in an
 *    email address, not a customer.
 *
 * The string values match the Prisma enums exactly, and this file depends only
 * on the other type modules, so the seed can import it before the API exists.
 */

import type {
  InvestorEligibility,
  KycDetails,
  KycDocumentKind,
  KycDocumentStatus,
  KycStanding,
  KycSubmissionStatus,
  RiskRating,
} from './kyc';
import type { SortDirection } from './staff';

/* -------------------------------------------------------------------------- */
/* Kinds and states                                                           */
/* -------------------------------------------------------------------------- */

export const INVESTOR_TYPES = ['INDIVIDUAL', 'CORPORATE'] as const;
export type InvestorType = (typeof INVESTOR_TYPES)[number];

/** How the investor arrived. */
export const INVESTOR_SOURCES = ['SELF_REGISTERED', 'STAFF_INVITED'] as const;
export type InvestorSource = (typeof INVESTOR_SOURCES)[number];

/**
 * Whether the account may be used at all — separate from whether the
 * investor's identity has been checked.
 *
 * - INVITED    staff sent an invitation; no password set yet. Cannot sign in.
 * - ACTIVE     may sign in and use the Investor Portal.
 * - SUSPENDED  temporarily blocked. Everything is kept and it can be lifted.
 * - CLOSED     the relationship has ended. Permanent; the record is kept for
 *              the retention period and nothing more can happen to it.
 *
 * Two separate axes — this and the KYC standing — because "may log in" and
 * "may invest" are different questions. A fully verified investor can be
 * suspended; an active account can still be waiting for its documents to be
 * checked.
 */
export const INVESTOR_STATUSES = ['INVITED', 'ACTIVE', 'SUSPENDED', 'CLOSED'] as const;
export type InvestorStatus = (typeof INVESTOR_STATUSES)[number];

/**
 * Which status may follow which.
 *
 * INVITED becomes ACTIVE when the person accepts the invitation and sets a
 * password — the system does that, not a staff member, which is why there is
 * no "activate" move below. An invitation that will never be accepted is
 * closed (or, if nothing was ever submitted, withdrawn entirely).
 */
export const INVESTOR_STATUS_TRANSITIONS: Record<InvestorStatus, readonly InvestorStatus[]> = {
  INVITED: ['ACTIVE', 'CLOSED'],
  ACTIVE: ['SUSPENDED', 'CLOSED'],
  SUSPENDED: ['ACTIVE', 'CLOSED'],
  CLOSED: [],
};

export function canInvestorTransition(from: InvestorStatus, to: InvestorStatus): boolean {
  return INVESTOR_STATUS_TRANSITIONS[from].includes(to);
}

/**
 * The account changes a staff member can make, each by name.
 *
 * Named for the same reason opportunity moves are: `reinstate` and the
 * system's own activation both end at ACTIVE and mean different things.
 * Every move here must also be allowed by INVESTOR_STATUS_TRANSITIONS above;
 * the contract spec in apps/api fails if the two disagree.
 */
export const INVESTOR_MOVES = {
  suspend: { from: ['ACTIVE'], to: 'SUSPENDED' },
  reinstate: { from: ['SUSPENDED'], to: 'ACTIVE' },
  close: { from: ['INVITED', 'ACTIVE', 'SUSPENDED'], to: 'CLOSED' },
} as const satisfies Record<string, { from: readonly InvestorStatus[]; to: InvestorStatus }>;

export type InvestorMove = keyof typeof INVESTOR_MOVES;

export const INVESTOR_MOVE_ORDER: readonly InvestorMove[] = ['reinstate', 'suspend', 'close'];

export function canInvestorMove(move: InvestorMove, status: InvestorStatus): boolean {
  return (INVESTOR_MOVES[move].from as readonly InvestorStatus[]).includes(status);
}

export function availableInvestorMoves(status: InvestorStatus): InvestorMove[] {
  return INVESTOR_MOVE_ORDER.filter((move) => canInvestorMove(move, status));
}

/**
 * Suspending and closing both take something away from a real person, so
 * whoever does it has to say why, and the audit trail keeps it.
 */
export const INVESTOR_MOVES_NEEDING_REASON: readonly InvestorMove[] = ['suspend', 'close'];

/**
 * A suspension or closure must have an explanatory reason.
 * Shared by API request validation and the Admin form.
 * Confirm these limits against the API DTO before deployment.
 */
export const MIN_INVESTOR_REASON_LENGTH = 10;
export const MAX_INVESTOR_REASON_LENGTH = 500;

/**
 * Whether a record may be removed outright rather than closed.
 *
 * Only an invitation that was never accepted and against which nothing was
 * ever submitted. Anything else is a customer record with a retention period.
 */
export function investorIsWithdrawable(investor: {
  status: InvestorStatus;
  hasEverSubmittedKyc: boolean;
}): boolean {
  return investor.status === 'INVITED' && !investor.hasEverSubmittedKyc;
}

/* -------------------------------------------------------------------------- */
/* The human reference                                                        */
/* -------------------------------------------------------------------------- */

/**
 * "INV-000042": what staff read out on the phone and type into a search box.
 *
 * Derived from a sequence number the database assigns, rather than stored, so
 * it can never disagree with that number. Six digits pads the first million
 * investors; past that it simply grows.
 */
export function investorReference(number: number): string {
  return `INV-${String(number).padStart(6, '0')}`;
}

/** The number in a reference someone typed, or null if it is not one. */
export function parseInvestorReference(text: string): number | null {
  const match = /^\s*INV-?0*(\d{1,12})\s*$/i.exec(text);
  if (!match) return null;
  const number = Number(match[1]);
  return Number.isSafeInteger(number) && number > 0 ? number : null;
}

/* -------------------------------------------------------------------------- */
/* Email                                                                      */
/* -------------------------------------------------------------------------- */

/**
 * Emails are compared and stored lowercase, trimmed — the same rule as staff
 * accounts — so "Sara@Example.com" and "sara@example.com" are one investor,
 * not two that later turn out to be the same person.
 */
export function normaliseEmail(email: string): string {
  return email.trim().toLowerCase();
}

/**
 * A permissive international-phone plausibility check, not a proof that a
 * telephone number exists. Accepts a leading + and common display separators;
 * allows 7-15 digits (ITU E.164 permits up to 15 digits).
 * Optional phone fields should be checked for blankness by their caller.
 */
export function isPlausiblePhone(value: unknown): boolean {
  if (typeof value !== 'string') return false;
  const phone = value.trim();
  if (!/^\+?[0-9 .()-]+$/.test(phone)) return false;
  const digits = phone.replace(/\D/g, '');
  return digits.length >= 7 && digits.length <= 15;
}

/* -------------------------------------------------------------------------- */
/* Shapes                                                                     */
/* -------------------------------------------------------------------------- */

/** An investor as the Admin list shows them. */
export interface InvestorListItem {
  id: string;
  /** The sequence number behind the reference. */
  number: number;
  /** "INV-000042". Sent, so no screen formats it differently. */
  reference: string;
  type: InvestorType;
  /** The person's name, or the company's. */
  displayName: string;
  email: string;
  phone: string | null;
  /** ISO 3166-1 alpha-2, where known. */
  countryOfResidence: string | null;
  status: InvestorStatus;
  source: InvestorSource;
  /** Worked out at the moment of the request, so EXPIRED is never stale. */
  kycStanding: KycStanding;
  kycRenewalInProgress: boolean;
  riskRating: RiskRating | null;
  kycExpiresAt: string | null;
  createdAt: string;
  lastLoginAt: string | null;
}

/** Everything on the investor detail page. */
export interface InvestorDetail extends InvestorListItem {
  /** Whether a sign-in account exists yet. False while an invitation is unanswered. */
  hasLogin: boolean;
  preferredLocale: string;
  invitedAt: string | null;
  invitationExpiresAt: string | null;
  invitedByName: string | null;
  activatedAt: string | null;
  closedAt: string | null;
  kycApprovedAt: string | null;
  /** Whether a KYC submission was ever handed in — decides whether the record can be withdrawn. */
  hasEverSubmittedKyc: boolean;
  /** The most recent submission, whatever its status. */
  latestSubmission: KycSubmissionSummary | null;
  /** May they invest right now, and if not, why. */
  eligibility: InvestorEligibility;
  updatedAt: string;
}

/** The dashboard's investor counts. */
export interface InvestorSummary {
  total: number;
  active: number;
  /** Submissions waiting for an officer or for a decision. */
  pendingReview: number;
  approved: number;
  /** Approvals running out within the next 30 days. */
  expiringSoon: number;
}

export const INVESTOR_SORT_FIELDS = ['number', 'displayName', 'createdAt', 'lastLoginAt'] as const;
export type InvestorSortField = (typeof INVESTOR_SORT_FIELDS)[number];

export interface InvestorListQuery {
  page?: number;
  pageSize?: number;
  /** Matches name, email, phone, or a reference like "INV-42". */
  search?: string;
  type?: InvestorType;
  status?: InvestorStatus;
  kycStanding?: KycStanding;
  riskRating?: RiskRating;
  source?: InvestorSource;
  sortField?: InvestorSortField;
  sortDirection?: SortDirection;
}

/** Staff inviting somebody. The rest of their details come through KYC. */
export interface InviteInvestorInput {
  type: InvestorType;
  email: string;
  displayName: string;
  phone?: string | null;
  countryOfResidence?: string | null;
  preferredLocale?: string;
}

/**
 * Housekeeping on the account. Not the email — that is the sign-in identity
 * and changes through its own verified flow — and not anything KYC confirms:
 * a verified name changes by submitting again, not by editing a field.
 */
export interface UpdateInvestorInput {
  displayName?: string;
  phone?: string | null;
  countryOfResidence?: string | null;
  preferredLocale?: string;
}

/** A submission in a list or a header. */
export interface KycSubmissionSummary {
  id: string;
  status: KycSubmissionStatus;
  investorType: InvestorType;
  riskRating: RiskRating | null;
  submittedAt: string | null;
  verifiedAt: string | null;
  decidedAt: string | null;
  /** True when staff prepared it for the investor rather than the investor themselves. */
  preparedByStaff: boolean;
  createdAt: string;
  updatedAt: string;
}

/** One uploaded file. Never its storage path: files are fetched through short-lived links. */
export interface KycDocumentItem {
  id: string;
  kind: KycDocumentKind;
  partyKey: string | null;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  status: KycDocumentStatus;
  reviewNote: string | null;
  reviewedByName: string | null;
  reviewedAt: string | null;
  uploadedBy: 'INVESTOR' | 'STAFF';
  uploadedByName: string | null;
  removed: boolean;
  createdAt: string;
}

/** A submission with everything in it, for the review screen. */
export interface KycSubmissionDetail extends KycSubmissionSummary {
  investorId: string;
  investorReference: string;
  details: KycDetails;
  documents: KycDocumentItem[];
  submittedByName: string | null;
  verifiedByName: string | null;
  verificationNote: string | null;
  decidedByName: string | null;
  decisionNote: string | null;
  changesRequestedNote: string | null;
  /** Staff who prepared any part of it — they may not verify or approve. */
  preparedByStaffIds: string[];
  verifiedById: string | null;
  /** Set on approval. */
  expiresAt: string | null;
}
