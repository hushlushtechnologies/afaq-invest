/**
 * Identity checks ("know your customer"), as every side of the platform sees
 * them.
 *
 * Nobody invests until somebody has checked who they are. This file holds the
 * rules for that check: what an investor has to tell us, which documents
 * prove it, who may look at them, in what order, and for how long the answer
 * stays good. The API refuses on these rules, the Admin Portal shows them as
 * a reviewer works, and the Investor Portal will use them to tell people what
 * is still missing — so all three agree because they are the same code.
 *
 * Decisions baked in here:
 *
 * 1. Two people, always. An officer checks the documents and sets a risk
 *    rating (VERIFIED); a different person approves or rejects. Somebody who
 *    prepared a case on an investor's behalf — typed it in, uploaded their
 *    passport — may neither verify nor approve it. A check the same person
 *    can pass themselves is not a check. See `kycSeparationConflict`.
 *
 * 2. What was reviewed is kept exactly as it was reviewed. Each submission
 *    carries its own copy of the investor's details and its own documents.
 *    A later change creates a new submission; it never edits the one an
 *    officer already signed off.
 *
 * 3. An approval expires — at the periodic review date for its risk rating,
 *    or when the earliest identity document runs out, whichever comes first.
 *    Expired is not the same as rejected: it means "check again", and it
 *    stops new investment until somebody does.
 *
 * 4. A rejection ends any approval still running. If a renewal turns up a
 *    problem, the earlier approval does not keep the investor investing
 *    until it happens to lapse.
 *
 * The values that are business decisions — review periods, the minimum age,
 * upload limits — are not here. They live in ComplianceSettings and are
 * passed in, so they can change from the Admin Portal without a deployment.
 * The document rules are here, in one function, because they are compliance
 * policy and should change only with a code review.
 */

import type { PermissionKey } from './rbac';
import type { InvestorStatus, InvestorType } from './investor';
import { closingDate, closingInstant } from './opportunity';

/* -------------------------------------------------------------------------- */
/* Submission status                                                          */
/* -------------------------------------------------------------------------- */

/**
 * Where one submission is in its review.
 *
 * - DRAFT              being filled in, by the investor or by staff for them.
 * - SUBMITTED          handed in. Waiting for an officer to check it.
 * - VERIFIED           an officer has checked every document and set a risk
 *                      rating. Waiting for a second person's decision.
 * - CHANGES_REQUESTED  sent back with a note. Editable again, then resubmitted.
 * - APPROVED           the investor's identity is confirmed. Final.
 * - REJECTED           refused. Final; a fresh attempt is a new submission.
 */
export const KYC_SUBMISSION_STATUSES = [
  'DRAFT',
  'SUBMITTED',
  'VERIFIED',
  'CHANGES_REQUESTED',
  'APPROVED',
  'REJECTED',
] as const;

export type KycSubmissionStatus = (typeof KYC_SUBMISSION_STATUSES)[number];

export const KYC_STATUS_TRANSITIONS: Record<KycSubmissionStatus, readonly KycSubmissionStatus[]> = {
  DRAFT: ['SUBMITTED'],
  SUBMITTED: ['VERIFIED', 'CHANGES_REQUESTED', 'REJECTED'],
  VERIFIED: ['APPROVED', 'CHANGES_REQUESTED', 'REJECTED'],
  CHANGES_REQUESTED: ['SUBMITTED'],
  APPROVED: [],
  REJECTED: [],
};

export function canKycTransition(from: KycSubmissionStatus, to: KycSubmissionStatus): boolean {
  return KYC_STATUS_TRANSITIONS[from].includes(to);
}

/** Statuses in which the details and documents may still change. */
export function kycIsEditable(status: KycSubmissionStatus): boolean {
  return status === 'DRAFT' || status === 'CHANGES_REQUESTED';
}

/** Statuses that are over. */
export function kycIsFinished(status: KycSubmissionStatus): boolean {
  return status === 'APPROVED' || status === 'REJECTED';
}

/**
 * The review steps, each by name.
 *
 * Every move here must also be allowed by KYC_STATUS_TRANSITIONS above; the
 * contract spec in apps/api fails if the two disagree.
 */
export const KYC_MOVES = {
  submit: { from: ['DRAFT', 'CHANGES_REQUESTED'], to: 'SUBMITTED' },
  verify: { from: ['SUBMITTED'], to: 'VERIFIED' },
  requestChanges: { from: ['SUBMITTED', 'VERIFIED'], to: 'CHANGES_REQUESTED' },
  approve: { from: ['VERIFIED'], to: 'APPROVED' },
  reject: { from: ['SUBMITTED', 'VERIFIED'], to: 'REJECTED' },
} as const satisfies Record<
  string,
  { from: readonly KycSubmissionStatus[]; to: KycSubmissionStatus }
>;

export type KycMove = keyof typeof KYC_MOVES;

/** Display order: forward first, final last. */
export const KYC_MOVE_ORDER: readonly KycMove[] = [
  'submit',
  'verify',
  'approve',
  'requestChanges',
  'reject',
];

export function canKycMove(move: KycMove, status: KycSubmissionStatus): boolean {
  return (KYC_MOVES[move].from as readonly KycSubmissionStatus[]).includes(status);
}

export function availableKycMoves(status: KycSubmissionStatus): KycMove[] {
  return KYC_MOVE_ORDER.filter((move) => canKycMove(move, status));
}

/**
 * The permission each review step needs, for staff.
 *
 * Submitting is absent: an investor submits their own case, and staff submit
 * one they prepared on the investor's behalf under `investor.edit`.
 * Requesting changes sits with `kyc.verify` because sending something back is
 * part of checking it — and every role that can approve can also verify.
 */
export const KYC_MOVE_PERMISSIONS: Record<Exclude<KycMove, 'submit'>, PermissionKey> = {
  verify: 'kyc.verify',
  requestChanges: 'kyc.verify',
  approve: 'kyc.approve',
  reject: 'kyc.reject',
};

/** Sending back and refusing both need a note the investor can act on. */
export const KYC_MOVES_NEEDING_REASON: readonly KycMove[] = ['requestChanges', 'reject'];

export const MIN_KYC_REASON_LENGTH = 3;
export const MAX_KYC_REASON_LENGTH = 1000;

/* -------------------------------------------------------------------------- */
/* Two people                                                                 */
/* -------------------------------------------------------------------------- */

export const KYC_SEPARATION_CONFLICTS = [
  'prepared_by_reviewer',
  'verifier_cannot_approve',
] as const;
export type KycSeparationConflict = (typeof KYC_SEPARATION_CONFLICTS)[number];

/**
 * Why this staff member may not take this step on this submission, or null.
 *
 * - Whoever prepared the case for the investor — submitted it, or uploaded
 *   any of its documents — may not verify or approve it.
 * - Whoever verified it may not approve it.
 *
 * Rejecting and sending back are deliberately not restricted: they are the
 * cautious outcomes, and the person best placed to stop a bad case is the
 * one who just looked at it.
 */
export function kycSeparationConflict(
  move: KycMove,
  submission: { preparedByStaffIds: readonly string[]; verifiedById: string | null },
  actorStaffId: string,
): KycSeparationConflict | null {
  if (move !== 'verify' && move !== 'approve') return null;

  if (submission.preparedByStaffIds.includes(actorStaffId)) return 'prepared_by_reviewer';
  if (move === 'approve' && submission.verifiedById === actorStaffId) {
    return 'verifier_cannot_approve';
  }

  return null;
}

/* -------------------------------------------------------------------------- */
/* Risk and expiry                                                            */
/* -------------------------------------------------------------------------- */

/** Set by the officer who verifies. Decides how soon the investor is checked again. */
export const RISK_RATINGS = ['LOW', 'MEDIUM', 'HIGH'] as const;
export type RiskRating = (typeof RISK_RATINGS)[number];

/** The values the Admin Portal can change. Read from ComplianceSettings. */
export type ComplianceSettings = {
  /** Nobody younger may invest. */
  minimumAge: number;
  /** How long an approval lasts, per risk rating, before it must be redone. */
  reviewMonths: Record<RiskRating, number>;
  /** The largest file an upload may be. */
  maxDocumentBytes: number;
  /** How long a staff invitation to an investor stays usable. */
  investorInvitationDays: number;
  updatedAt: string;
};

/** What the seed writes, and what a fresh platform starts with. */
export const COMPLIANCE_DEFAULTS: Omit<ComplianceSettings, 'updatedAt'> = {
  minimumAge: 18,
  reviewMonths: { LOW: 36, MEDIUM: 24, HIGH: 12 },
  maxDocumentBytes: 10 * 1024 * 1024,
  investorInvitationDays: 7,
};

/**
 * `months` calendar months after `from`, clamped to the end of the month.
 *
 * 31 January plus one month is 28 or 29 February, not 3 March — the rollover
 * plain Date arithmetic produces. Worked in UTC so the result does not depend
 * on the machine's time zone.
 */
export function addMonths(from: Date, months: number): Date {
  const year = from.getUTCFullYear();
  const month = from.getUTCMonth() + months;
  const lastDay = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();

  return new Date(
    Date.UTC(
      year,
      month,
      Math.min(from.getUTCDate(), lastDay),
      from.getUTCHours(),
      from.getUTCMinutes(),
      from.getUTCSeconds(),
      from.getUTCMilliseconds(),
    ),
  );
}

/**
 * When an approval stops being good.
 *
 * The earlier of the periodic review date for the risk rating and the end of
 * the day (UAE time) on which the first identity document expires. An
 * approval is only as good as the documents it rests on: a passport that runs
 * out next month makes next month the date, whatever the risk rating says.
 */
export function kycExpiry({
  approvedAt,
  riskRating,
  reviewMonths,
  documentExpiries,
}: {
  approvedAt: Date;
  riskRating: RiskRating;
  reviewMonths: Record<RiskRating, number>;
  /** Calendar dates, YYYY-MM-DD, of every identity document relied on. */
  documentExpiries: readonly string[];
}): Date {
  let expiry = addMonths(approvedAt, reviewMonths[riskRating]);

  for (const date of documentExpiries) {
    if (!isCalendarDate(date)) continue;
    const ends = new Date(closingInstant(date));
    if (ends < expiry) expiry = ends;
  }

  return expiry;
}

/* -------------------------------------------------------------------------- */
/* Standing: the one answer most of the platform needs                        */
/* -------------------------------------------------------------------------- */

/**
 * The investor's identity-check position, in one word.
 *
 * Kept on the investor record (as the projection of their latest submission)
 * so lists can filter on it without joining every submission. EXPIRED is
 * never stored: it is worked out from the expiry date at the moment it is
 * asked, by `kycStanding` below, so it cannot be stale.
 */
export const KYC_STANDINGS = [
  'NOT_STARTED',
  'IN_PROGRESS',
  'PENDING_REVIEW',
  'APPROVED',
  'REJECTED',
  'EXPIRED',
] as const;

export type KycStanding = (typeof KYC_STANDINGS)[number];

/** What is stored: every standing except the computed one. */
export type StoredKycStanding = Exclude<KycStanding, 'EXPIRED'>;

/** The stored projection of a submission in this status. */
export function standingOf(status: KycSubmissionStatus): StoredKycStanding {
  switch (status) {
    case 'DRAFT':
    case 'CHANGES_REQUESTED':
      return 'IN_PROGRESS';
    case 'SUBMITTED':
    case 'VERIFIED':
      return 'PENDING_REVIEW';
    case 'APPROVED':
      return 'APPROVED';
    case 'REJECTED':
      return 'REJECTED';
    default: {
      const unhandled: never = status;
      return unhandled;
    }
  }
}

/**
 * The standing right now.
 *
 * - A rejection wins outright (see decision 4 at the top of this file).
 * - An approval still in date wins over a renewal in progress: starting the
 *   periodic re-check must not stop somebody investing.
 * - An approval past its date is EXPIRED.
 * - Otherwise, whatever the latest submission says.
 */
export function kycStanding(
  investor: { kycStatus: StoredKycStanding; kycExpiresAt: Date | string | null },
  now: Date = new Date(),
): KycStanding {
  if (investor.kycStatus === 'REJECTED') return 'REJECTED';

  const expires = investor.kycExpiresAt === null ? null : new Date(investor.kycExpiresAt);

  if (expires !== null && expires.getTime() > now.getTime()) return 'APPROVED';
  if (expires !== null) {
    // Past its date. A renewal already under way is the more useful thing to
    // show than "expired", because it says somebody is on it.
    return investor.kycStatus === 'APPROVED' ? 'EXPIRED' : investor.kycStatus;
  }

  return investor.kycStatus;
}

/** True when an approval is still good and a new submission is being worked on. */
export function kycRenewalInProgress(
  investor: { kycStatus: StoredKycStanding; kycExpiresAt: Date | string | null },
  now: Date = new Date(),
): boolean {
  return (
    kycStanding(investor, now) === 'APPROVED' &&
    (investor.kycStatus === 'IN_PROGRESS' || investor.kycStatus === 'PENDING_REVIEW')
  );
}

export const INVEST_REFUSAL_REASONS = [
  'account_inactive',
  'kyc_not_approved',
  'kyc_expired',
] as const;
export type InvestRefusalReason = (typeof INVEST_REFUSAL_REASONS)[number];

export type InvestorEligibility =
  { eligible: true } | { eligible: false; reason: InvestRefusalReason };

/**
 * May this investor put money in right now?
 *
 * The investor half of the question; `investmentAvailability` in
 * ./opportunity is the raise half. Both must say yes. A reason rather than a
 * boolean, because "your account is suspended" and "your ID has expired" send
 * somebody to two different places.
 */
export function investorEligibility(
  investor: {
    status: InvestorStatus;
    kycStatus: StoredKycStanding;
    kycExpiresAt: Date | string | null;
  },
  now: Date = new Date(),
): InvestorEligibility {
  if (investor.status !== 'ACTIVE') return { eligible: false, reason: 'account_inactive' };

  const standing = kycStanding(investor, now);
  if (standing === 'EXPIRED') return { eligible: false, reason: 'kyc_expired' };
  if (standing !== 'APPROVED') return { eligible: false, reason: 'kyc_not_approved' };

  return { eligible: true };
}

/* -------------------------------------------------------------------------- */
/* What an investor tells us                                                  */
/* -------------------------------------------------------------------------- */

export const KYC_ID_TYPES = ['EMIRATES_ID', 'PASSPORT'] as const;
export type KycIdType = (typeof KYC_ID_TYPES)[number];

export const SOURCES_OF_FUNDS = [
  'SALARY',
  'BUSINESS_INCOME',
  'INVESTMENTS',
  'SAVINGS',
  'INHERITANCE',
  'PROPERTY_SALE',
  'OTHER',
] as const;

export type SourceOfFunds = (typeof SOURCES_OF_FUNDS)[number];

export const KYC_PARTY_ROLES = ['AUTHORISED_SIGNATORY', 'BENEFICIAL_OWNER'] as const;
export type KycPartyRole = (typeof KYC_PARTY_ROLES)[number];

/**
 * The ownership share at which somebody must be identified as a beneficial
 * owner, in percent. The UAE beneficial-ownership rules use 25%.
 */
export const BENEFICIAL_OWNERSHIP_THRESHOLD = 25;

/*
 * Every shape below is written to a Json column, so each is a `type` alias,
 * not an interface: TypeScript only accepts an object type as JSON when it can
 * be read as having an index signature, which an alias can and an interface
 * cannot. Dates are calendar dates as "YYYY-MM-DD" strings — a date of birth
 * has no time of day, and storing one invites a time zone to move it.
 */

export type KycIdentity = {
  idType: KycIdType;
  idNumber: string;
  /** ISO 3166-1 alpha-2, e.g. "AE". */
  issuingCountry: string;
  /** YYYY-MM-DD. */
  expiryDate: string;
};

export type KycAddress = {
  line1: string;
  line2: string | null;
  city: string;
  /** Emirate, state or province. */
  region: string | null;
  postalCode: string | null;
  /** ISO 3166-1 alpha-2. */
  country: string;
};

export type IndividualKycDetails = {
  type: 'INDIVIDUAL';
  /** As printed on the passport. */
  fullName: string;
  /** YYYY-MM-DD. */
  dateOfBirth: string;
  /** ISO 3166-1 alpha-2. */
  nationality: string;
  /** ISO 3166-1 alpha-2. "AE" decides which documents are needed. */
  countryOfResidence: string;
  /** One per kind of document held — an Emirates ID and a passport, say. */
  identities: KycIdentity[];
  address: KycAddress;
  occupation: string;
  employer: string | null;
  sourceOfFunds: SourceOfFunds;
  /** Required when sourceOfFunds is OTHER. */
  sourceOfFundsDetail: string | null;
  /** Politically exposed person: holds, or recently held, a prominent public role. */
  isPep: boolean;
  /** Required when isPep. */
  pepDetail: string | null;
};

/** Somebody who signs for, or owns part of, a corporate investor. */
export type KycParty = {
  /**
   * Stable within the submission, chosen by whoever adds the party. Documents
   * point at a party by this key, because the list is edited as a whole and
   * array positions move.
   */
  key: string;
  roles: KycPartyRole[];
  fullName: string;
  /** YYYY-MM-DD. */
  dateOfBirth: string;
  nationality: string;
  /** Percent, 0–100. Null for somebody who signs but owns nothing. */
  ownershipPercent: number | null;
  identity: KycIdentity;
  isPep: boolean;
};

export type CorporateKycDetails = {
  type: 'CORPORATE';
  legalName: string;
  tradeLicenceNumber: string;
  /** Who issued the licence — "Dubai DET", "ADGM", "DMCC". */
  licenceAuthority: string;
  /** YYYY-MM-DD. */
  licenceExpiry: string;
  countryOfIncorporation: string;
  registeredAddress: KycAddress;
  businessActivity: string;
  sourceOfFunds: SourceOfFunds;
  sourceOfFundsDetail: string | null;
  parties: KycParty[];
};

export type KycDetails = IndividualKycDetails | CorporateKycDetails;

/* -------------------------------------------------------------------------- */
/* Documents                                                                  */
/* -------------------------------------------------------------------------- */

export const KYC_DOCUMENT_KINDS = [
  'EMIRATES_ID_FRONT',
  'EMIRATES_ID_BACK',
  'PASSPORT',
  'PROOF_OF_ADDRESS',
  'TRADE_LICENCE',
  'MEMORANDUM_OF_ASSOCIATION',
  /** Identity document of a signatory or owner; carries their party key. */
  'PARTY_ID',
  'SOURCE_OF_FUNDS',
  'OTHER',
] as const;

export type KycDocumentKind = (typeof KYC_DOCUMENT_KINDS)[number];

/**
 * A document's own review.
 *
 * Each file is accepted or rejected individually, so "your proof of address
 * is older than three months" can be said about that file rather than about
 * the whole case.
 */
export const KYC_DOCUMENT_STATUSES = ['PENDING', 'ACCEPTED', 'REJECTED'] as const;
export type KycDocumentStatus = (typeof KYC_DOCUMENT_STATUSES)[number];

/** What may be uploaded. Scans and phone photos; nothing that can run. */
export const KYC_DOCUMENT_MIME_TYPES = ['application/pdf', 'image/jpeg', 'image/png'] as const;
export type KycDocumentMimeType = (typeof KYC_DOCUMENT_MIME_TYPES)[number];

export const KYC_UPLOAD_REFUSALS = ['empty', 'too_large', 'unsupported_type'] as const;
export type KycUploadRefusal = (typeof KYC_UPLOAD_REFUSALS)[number];

export function kycUploadRefusal(
  file: { mimeType: string; sizeBytes: number },
  maxDocumentBytes: number,
): KycUploadRefusal | null {
  if (!(file.sizeBytes > 0)) return 'empty';
  if (file.sizeBytes > maxDocumentBytes) return 'too_large';
  if (!(KYC_DOCUMENT_MIME_TYPES as readonly string[]).includes(file.mimeType)) {
    return 'unsupported_type';
  }
  return null;
}

/** One document a submission must include. */
export type RequiredDocument = { kind: KycDocumentKind; partyKey: string | null };

/**
 * The documents this submission has to include.
 *
 * Compliance policy, in one place:
 *
 * - An individual living in the UAE: Emirates ID front and back, and a
 *   passport.
 * - An individual living elsewhere: a passport and a proof of address.
 * - A company: its trade licence and memorandum of association, and an
 *   identity document for every signatory and every owner listed.
 * - Anybody politically exposed — the investor, or any party of a company —
 *   adds evidence of where the money comes from. That is enhanced due
 *   diligence, and it is not optional for them.
 */
export function requiredDocuments(details: KycDetails): RequiredDocument[] {
  const required: RequiredDocument[] = [];
  const need = (kind: KycDocumentKind, partyKey: string | null = null): void => {
    required.push({ kind, partyKey });
  };

  if (details.type === 'INDIVIDUAL') {
    if (details.countryOfResidence === 'AE') {
      need('EMIRATES_ID_FRONT');
      need('EMIRATES_ID_BACK');
      need('PASSPORT');
    } else {
      need('PASSPORT');
      need('PROOF_OF_ADDRESS');
    }
    if (details.isPep) need('SOURCE_OF_FUNDS');
    return required;
  }

  need('TRADE_LICENCE');
  need('MEMORANDUM_OF_ASSOCIATION');
  for (const party of details.parties) need('PARTY_ID', party.key);
  if (details.parties.some((party) => party.isPep)) need('SOURCE_OF_FUNDS');

  return required;
}

/** A document as far as the rules care. */
export type KycDocumentFacts = {
  kind: KycDocumentKind;
  partyKey: string | null;
  status: KycDocumentStatus;
  /** Set when the uploader took it back while the case was editable. */
  removed: boolean;
};

function matches(document: KycDocumentFacts, required: RequiredDocument): boolean {
  return (
    !document.removed &&
    document.kind === required.kind &&
    (required.partyKey === null || document.partyKey === required.partyKey)
  );
}

/* -------------------------------------------------------------------------- */
/* Small format helpers                                                       */
/* -------------------------------------------------------------------------- */

const COUNTRY_CODE = /^[A-Z]{2}$/;

export function isCountryCode(value: string): boolean {
  return COUNTRY_CODE.test(value);
}

/** A real calendar date written YYYY-MM-DD. 2026-02-30 is not one. */
export function isCalendarDate(value: string): boolean {
  try {
    closingInstant(value);
    return true;
  } catch {
    return false;
  }
}

/**
 * Whole years between a date of birth and today, in the platform calendar.
 *
 * Counted on dates, not milliseconds, so somebody born on the 7th turns 18 on
 * the 7th in Dubai — not a few hours earlier or later depending on where the
 * server happens to be.
 */
export function ageOn(dateOfBirth: string, now: Date): number {
  const [birthYear, birthMonth, birthDay] = dateOfBirth.split('-').map(Number) as [
    number,
    number,
    number,
  ];
  const [year, month, day] = closingDate(now).split('-').map(Number) as [number, number, number];

  let age = year - birthYear;
  if (month < birthMonth || (month === birthMonth && day < birthDay)) age -= 1;
  return age;
}

/** An Emirates ID with the punctuation removed: 15 digits, starting 784. */
export function normaliseEmiratesId(value: string): string {
  return value.replace(/[\s-]/g, '');
}

/**
 * Whether this is shaped like an Emirates ID. Format only: whether it is a
 * real, current card is what the document check is for.
 */
export function isEmiratesIdFormat(value: string): boolean {
  return /^784\d{12}$/.test(normaliseEmiratesId(value));
}

/** 784-1990-1234567-1, the way it is printed on the card. */
export function formatEmiratesId(value: string): string {
  const digits = normaliseEmiratesId(value);
  if (!/^\d{15}$/.test(digits)) return value;
  return `${digits.slice(0, 3)}-${digits.slice(3, 7)}-${digits.slice(7, 14)}-${digits.slice(14)}`;
}

/**
 * The last four characters, for lists and logs. A full identity number on a
 * screen that does not need it is a number somebody can photograph.
 */
export function maskIdNumber(value: string): string {
  const compact = value.replace(/[\s-]/g, '');
  if (compact.length <= 4) return '••••';
  return `•••• ${compact.slice(-4)}`;
}

/* -------------------------------------------------------------------------- */
/* Validation                                                                 */
/* -------------------------------------------------------------------------- */

/**
 * What can be wrong with a submission. Codes, not sentences: the API refuses
 * on them and the portals translate them, the same convention as opportunity
 * issues. `field` is a path into the details — "identities.0.expiryDate",
 * "parties.2.ownershipPercent" — so a form can put the message by the field.
 */
export const KYC_ISSUE_CODES = [
  'required',
  'invalid_country',
  'invalid_date',
  'too_young',
  'date_in_future',
  'id_expired',
  'invalid_emirates_id',
  'duplicate_identity',
  'missing_emirates_id',
  'missing_passport',
  'licence_expired',
  'ownership_out_of_range',
  'ownership_over_total',
  'no_signatory',
  'no_beneficial_owner',
  'owner_without_share',
  'missing_document',
  'document_not_accepted',
  'no_risk_rating',
] as const;

export type KycIssueCode = (typeof KYC_ISSUE_CODES)[number];

export type KycIssue = {
  code: KycIssueCode;
  field?: string;
  /** English, for developers reading a raw API response. Portals translate the code. */
  message: string;
  /** Values the translated message interpolates. */
  values?: Record<string, number | string>;
};

export type KycValidationContext = {
  now: Date;
  minimumAge: number;
};

/**
 * Everything wrong with the details, in one pass.
 *
 * `complete` separates saving from submitting. Saving a draft only has to be
 * well-formed: a country code that is a country code, a date that is a date.
 * Submitting also has to be complete — every required field, the right
 * identity documents for where somebody lives, a signatory and an owner for a
 * company. A half-typed draft is not covered in errors about fields nobody
 * has reached yet.
 */
export function validateKycDetails(
  details: KycDetails,
  context: KycValidationContext,
  { complete }: { complete: boolean },
): KycIssue[] {
  const issues: KycIssue[] = [];
  const add = (issue: KycIssue): void => {
    issues.push(issue);
  };

  const requireText = (value: string | null | undefined, field: string): void => {
    if (complete && (value === null || value === undefined || value.trim() === '')) {
      add({ code: 'required', field, message: `${field} is required.` });
    }
  };

  const checkCountry = (value: string, field: string): void => {
    if (value.trim() === '') {
      requireText(value, field);
    } else if (!isCountryCode(value)) {
      add({ code: 'invalid_country', field, message: `${field} is not a country code.` });
    }
  };

  /** A calendar date; `past` dates only, for births and incorporations. */
  const checkDate = (value: string, field: string, { past }: { past: boolean }): boolean => {
    if (value.trim() === '') {
      requireText(value, field);
      return false;
    }
    if (!isCalendarDate(value)) {
      add({ code: 'invalid_date', field, message: `${field} is not a real date.` });
      return false;
    }
    if (past && value > closingDate(context.now)) {
      add({ code: 'date_in_future', field, message: `${field} is in the future.` });
      return false;
    }
    return true;
  };

  const checkIdentity = (identity: KycIdentity, field: string): void => {
    requireText(identity.idNumber, `${field}.idNumber`);
    checkCountry(identity.issuingCountry, `${field}.issuingCountry`);

    if (
      identity.idType === 'EMIRATES_ID' &&
      identity.idNumber.trim() !== '' &&
      !isEmiratesIdFormat(identity.idNumber)
    ) {
      add({
        code: 'invalid_emirates_id',
        field: `${field}.idNumber`,
        message: 'An Emirates ID has 15 digits and starts with 784.',
      });
    }

    if (checkDate(identity.expiryDate, `${field}.expiryDate`, { past: false })) {
      if (identity.expiryDate < closingDate(context.now)) {
        add({
          code: 'id_expired',
          field: `${field}.expiryDate`,
          message: 'This identity document has expired.',
        });
      }
    }
  };

  const checkAddress = (address: KycAddress, field: string): void => {
    requireText(address.line1, `${field}.line1`);
    requireText(address.city, `${field}.city`);
    checkCountry(address.country, `${field}.country`);
  };

  const checkFunds = (source: SourceOfFunds, detail: string | null): void => {
    if (source === 'OTHER') requireText(detail, 'sourceOfFundsDetail');
  };

  if (details.type === 'INDIVIDUAL') {
    requireText(details.fullName, 'fullName');

    if (checkDate(details.dateOfBirth, 'dateOfBirth', { past: true })) {
      if (ageOn(details.dateOfBirth, context.now) < context.minimumAge) {
        add({
          code: 'too_young',
          field: 'dateOfBirth',
          message: `Investors must be at least ${context.minimumAge}.`,
          values: { minimumAge: context.minimumAge },
        });
      }
    }

    checkCountry(details.nationality, 'nationality');
    checkCountry(details.countryOfResidence, 'countryOfResidence');

    const seen = new Set<KycIdType>();
    details.identities.forEach((identity, index) => {
      if (seen.has(identity.idType)) {
        add({
          code: 'duplicate_identity',
          field: `identities.${index}.idType`,
          message: 'Each kind of identity document is listed once.',
        });
      }
      seen.add(identity.idType);
      checkIdentity(identity, `identities.${index}`);
    });

    if (complete) {
      if (details.countryOfResidence === 'AE' && !seen.has('EMIRATES_ID')) {
        add({
          code: 'missing_emirates_id',
          field: 'identities',
          message: 'UAE residents must give their Emirates ID.',
        });
      }
      if (!seen.has('PASSPORT')) {
        add({ code: 'missing_passport', field: 'identities', message: 'A passport is required.' });
      }
    }

    checkAddress(details.address, 'address');
    requireText(details.occupation, 'occupation');
    checkFunds(details.sourceOfFunds, details.sourceOfFundsDetail);
    if (details.isPep) requireText(details.pepDetail, 'pepDetail');

    return issues;
  }

  // --- corporate -------------------------------------------------------------
  requireText(details.legalName, 'legalName');
  requireText(details.tradeLicenceNumber, 'tradeLicenceNumber');
  requireText(details.licenceAuthority, 'licenceAuthority');

  if (checkDate(details.licenceExpiry, 'licenceExpiry', { past: false })) {
    if (details.licenceExpiry < closingDate(context.now)) {
      add({
        code: 'licence_expired',
        field: 'licenceExpiry',
        message: 'The trade licence has expired.',
      });
    }
  }

  checkCountry(details.countryOfIncorporation, 'countryOfIncorporation');
  checkAddress(details.registeredAddress, 'registeredAddress');
  requireText(details.businessActivity, 'businessActivity');
  checkFunds(details.sourceOfFunds, details.sourceOfFundsDetail);

  let totalOwnership = 0;

  details.parties.forEach((party, index) => {
    const field = `parties.${index}`;
    requireText(party.fullName, `${field}.fullName`);
    checkDate(party.dateOfBirth, `${field}.dateOfBirth`, { past: true });
    checkCountry(party.nationality, `${field}.nationality`);
    checkIdentity(party.identity, `${field}.identity`);

    if (complete && party.roles.length === 0) {
      add({ code: 'required', field: `${field}.roles`, message: 'Each person needs a role.' });
    }

    if (party.ownershipPercent !== null) {
      if (!(party.ownershipPercent >= 0 && party.ownershipPercent <= 100)) {
        add({
          code: 'ownership_out_of_range',
          field: `${field}.ownershipPercent`,
          message: 'An ownership share is between 0 and 100 percent.',
        });
      } else {
        totalOwnership += party.ownershipPercent;
      }
    }

    if (
      complete &&
      party.roles.includes('BENEFICIAL_OWNER') &&
      (party.ownershipPercent === null || party.ownershipPercent <= 0)
    ) {
      add({
        code: 'owner_without_share',
        field: `${field}.ownershipPercent`,
        message: 'A beneficial owner must have an ownership share.',
      });
    }
  });

  // Rounded to two places before comparing, so three owners of 33.33%,
  // 33.33% and 33.34% are 100 and not 100.00000000000001.
  const total = Math.round(totalOwnership * 100) / 100;
  if (total > 100) {
    add({
      code: 'ownership_over_total',
      field: 'parties',
      message: `The ownership shares add up to ${total}%, more than 100%.`,
      values: { total },
    });
  }

  if (complete) {
    if (!details.parties.some((party) => party.roles.includes('AUTHORISED_SIGNATORY'))) {
      add({
        code: 'no_signatory',
        field: 'parties',
        message: 'Name at least one person who signs for the company.',
      });
    }
    if (!details.parties.some((party) => party.roles.includes('BENEFICIAL_OWNER'))) {
      add({
        code: 'no_beneficial_owner',
        field: 'parties',
        message: `Name every owner of ${BENEFICIAL_OWNERSHIP_THRESHOLD}% or more — or, if there is none, the person who controls the company.`,
        values: { threshold: BENEFICIAL_OWNERSHIP_THRESHOLD },
      });
    }
  }

  return issues;
}

/** The required documents not yet uploaded (rejected ones count as missing). */
export function missingDocuments(
  details: KycDetails,
  documents: readonly KycDocumentFacts[],
): KycIssue[] {
  return requiredDocuments(details)
    .filter(
      (required) =>
        !documents.some(
          (document) => matches(document, required) && document.status !== 'REJECTED',
        ),
    )
    .map((required) => ({
      code: 'missing_document' as const,
      field: 'documents',
      message: `A ${required.kind} document is required${required.partyKey ? ` for party ${required.partyKey}` : ''}.`,
      values: {
        kind: required.kind,
        ...(required.partyKey ? { partyKey: required.partyKey } : {}),
      },
    }));
}

/**
 * Can this be handed in? Complete details and every required document.
 * Saving a draft asks `validateKycDetails(..., { complete: false })` instead.
 */
export function submissionIssues(
  details: KycDetails,
  documents: readonly KycDocumentFacts[],
  context: KycValidationContext,
): KycIssue[] {
  return [
    ...validateKycDetails(details, context, { complete: true }),
    ...missingDocuments(details, documents),
  ];
}

/**
 * Can an officer mark this verified? Every required document must have been
 * looked at and accepted, and a risk rating chosen — the rating is what
 * decides when the investor is checked again, so it cannot be left for later.
 */
export function verificationIssues(
  details: KycDetails,
  documents: readonly KycDocumentFacts[],
  riskRating: RiskRating | null,
): KycIssue[] {
  const issues: KycIssue[] = requiredDocuments(details)
    .filter(
      (required) =>
        !documents.some(
          (document) => matches(document, required) && document.status === 'ACCEPTED',
        ),
    )
    .map((required) => ({
      code: 'document_not_accepted' as const,
      field: 'documents',
      message: `The ${required.kind} document has not been accepted${required.partyKey ? ` for party ${required.partyKey}` : ''}.`,
      values: {
        kind: required.kind,
        ...(required.partyKey ? { partyKey: required.partyKey } : {}),
      },
    }));

  if (riskRating === null) {
    issues.push({
      code: 'no_risk_rating',
      field: 'riskRating',
      message: 'Choose a risk rating before verifying.',
    });
  }

  return issues;
}

/** The expiry dates of every identity document the details rely on. */
export function identityExpiries(details: KycDetails): string[] {
  if (details.type === 'INDIVIDUAL') {
    return details.identities.map((identity) => identity.expiryDate);
  }
  return [details.licenceExpiry, ...details.parties.map((party) => party.identity.expiryDate)];
}

/** The name a submission is about: the person, or the company. */
export function kycSubjectName(details: KycDetails): string {
  return details.type === 'INDIVIDUAL' ? details.fullName : details.legalName;
}

/** An empty draft of the right kind, for the form to start from. */
export function emptyKycDetails(type: InvestorType): KycDetails {
  const address: KycAddress = {
    line1: '',
    line2: null,
    city: '',
    region: null,
    postalCode: null,
    country: '',
  };

  if (type === 'INDIVIDUAL') {
    return {
      type: 'INDIVIDUAL',
      fullName: '',
      dateOfBirth: '',
      nationality: '',
      countryOfResidence: '',
      identities: [],
      address,
      occupation: '',
      employer: null,
      sourceOfFunds: 'SALARY',
      sourceOfFundsDetail: null,
      isPep: false,
      pepDetail: null,
    };
  }

  return {
    type: 'CORPORATE',
    legalName: '',
    tradeLicenceNumber: '',
    licenceAuthority: '',
    licenceExpiry: '',
    countryOfIncorporation: '',
    registeredAddress: address,
    businessActivity: '',
    sourceOfFunds: 'BUSINESS_INCOME',
    sourceOfFundsDetail: null,
    parties: [],
  };
}
