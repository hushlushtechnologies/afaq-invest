#!/usr/bin/env node
/**
 * Phase 23: applies the edits to existing files that are too large to paste
 * whole for the lines that changed.
 *
 * Generated from the actual change, not written by hand: each edit is the
 * smallest surrounding text that appears exactly once in the end-of-Phase-22
 * file, and the whole set was proven by replaying it onto those files and
 * getting the end-of-Phase-23 files back byte for byte.
 *
 * Checked before writing: if any expected text is not there exactly once,
 * nothing at all is written and it names the edit. Edits already in place are
 * skipped, so running it twice is harmless. Windows line endings are kept.
 *
 *   Run from the repository root:  node scripts/apply-phase-23.mjs
 *
 * Safe to delete once it reports success.
 */

import console from 'node:console';
import process from 'node:process';
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

/** [file, which edit, text expected, text it becomes] */
const EDITS = [
  [
    'packages/database/prisma/schema.prisma',
    'schema.prisma (1/4)',
    '  OPPORTUNITY\n}',
    '  OPPORTUNITY\n  INVESTOR\n  KYC\n}',
  ],
  [
    'packages/database/prisma/schema.prisma',
    'schema.prisma (2/4)',
    '  opportunitiesClosed  InvestmentOpportunity[] @relation("OpportunityClosedBy")\n',
    '  opportunitiesClosed  InvestmentOpportunity[] @relation("OpportunityClosedBy")\n\n  investorsInvited        Investor[]           @relation("InvestorInvitedBy")\n  kycSubmissionsPrepared  KycSubmission[]      @relation("KycSubmittedByStaff")\n  kycSubmissionsVerified  KycSubmission[]      @relation("KycVerifiedBy")\n  kycSubmissionsDecided   KycSubmission[]      @relation("KycDecidedBy")\n  kycChangesRequested     KycSubmission[]      @relation("KycChangesRequestedBy")\n  kycDocumentsUploaded    KycDocument[]        @relation("KycDocumentUploadedBy")\n  kycDocumentsReviewed    KycDocument[]        @relation("KycDocumentReviewedBy")\n  complianceSettingsSaved ComplianceSettings[] @relation("ComplianceSettingsUpdatedBy")\n',
  ],
  [
    'packages/database/prisma/schema.prisma',
    'schema.prisma (3/4)',
    '}\n// ===========================================================================',
    '}\n\n// ===========================================================================',
  ],
  [
    'packages/database/prisma/schema.prisma',
    'schema.prisma (4/4)',
    '  @@map("investment_opportunities")\n}\n',
    '  @@map("investment_opportunities")\n}\n\n// ===========================================================================\n// INVESTORS AND KYC\n// ===========================================================================\n//\n// The rules — which status may follow which, who may take which review step,\n// what documents are required, when an approval expires — live in\n// @afaq/types (investor.ts and kyc.ts), with tests. These tables hold the\n// facts the rules are applied to.\n\n/// A person, or a company.\nenum InvestorType {\n  INDIVIDUAL\n  CORPORATE\n}\n\n/// How the investor arrived: signed up themselves, or invited by staff.\nenum InvestorSource {\n  SELF_REGISTERED\n  STAFF_INVITED\n}\n\n/// Whether the account may be used at all. Separate from the identity check,\n/// because "may sign in" and "may invest" are different questions.\n///\n/// INVITED   invited by staff; no password yet — cannot sign in\n/// ACTIVE    may sign in\n/// SUSPENDED temporarily blocked; everything is kept and it can be lifted\n/// CLOSED    the relationship has ended; kept for the retention period\nenum InvestorStatus {\n  INVITED\n  ACTIVE\n  SUSPENDED\n  CLOSED\n}\n\n/// The investor\'s identity-check position, as the projection of their latest\n/// submission. EXPIRED is deliberately absent: it is worked out from\n/// `kycExpiresAt` when asked, so it can never be stale.\nenum KycStanding {\n  NOT_STARTED\n  IN_PROGRESS\n  PENDING_REVIEW\n  APPROVED\n  REJECTED\n}\n\n/// Where one submission is in its two-person review.\nenum KycSubmissionStatus {\n  DRAFT\n  SUBMITTED\n  VERIFIED\n  CHANGES_REQUESTED\n  APPROVED\n  REJECTED\n}\n\n/// Set by the officer who verifies; decides how soon the investor is checked\n/// again.\nenum RiskRating {\n  LOW\n  MEDIUM\n  HIGH\n}\n\nenum KycDocumentKind {\n  EMIRATES_ID_FRONT\n  EMIRATES_ID_BACK\n  PASSPORT\n  PROOF_OF_ADDRESS\n  TRADE_LICENCE\n  MEMORANDUM_OF_ASSOCIATION\n  PARTY_ID\n  SOURCE_OF_FUNDS\n  OTHER\n}\n\n/// Each file is accepted or rejected on its own, so a problem can be named\n/// against the file that has it.\nenum KycDocumentStatus {\n  PENDING\n  ACCEPTED\n  REJECTED\n}\n\n/// Somebody who may invest, once their identity has been checked.\n///\n/// Holds the account and what lists need to show. The details an officer\n/// actually checked — dates of birth, identity numbers, addresses — live on\n/// the submission that was checked, not here, so what was reviewed can never\n/// be quietly changed afterwards.\n///\n/// Never deleted once anything has been submitted: UAE anti-money-laundering\n/// rules require identity records to be kept for years after the relationship\n/// ends. Such an account is CLOSED instead.\nmodel Investor {\n  id String @id @default(uuid()) @db.Uuid\n\n  /// Assigned by the database, in order, and never reused. The reference\n  /// staff read out — "INV-000042" — is formatted from it rather than stored,\n  /// so the two can never disagree.\n  number Int @unique @default(autoincrement())\n\n  /// Supabase auth.users.id. Null while a staff invitation is unanswered.\n  authUserId String? @unique @map("auth_user_id") @db.Uuid\n\n  type   InvestorType\n  source InvestorSource\n\n  /// Always stored lowercase and trimmed: the sign-in identity.\n  email String  @unique\n  phone String?\n\n  /// The person\'s name or the company\'s, as lists show it. Replaced with the\n  /// verified name when a submission is approved.\n  displayName String @map("display_name")\n\n  /// ISO 3166-1 alpha-2, where known before KYC confirms it.\n  countryOfResidence String? @map("country_of_residence")\n\n  preferredLocale String @default("en") @map("preferred_locale")\n\n  status InvestorStatus @default(INVITED)\n\n  // --- identity-check projection, written in the same transaction as every\n  // --- submission change. A cache, documented as one: the submissions are\n  // --- the record, these columns make lists and eligibility cheap.\n  kycStatus     KycStanding @default(NOT_STARTED) @map("kyc_status")\n  riskRating    RiskRating? @map("risk_rating")\n  kycApprovedAt DateTime?   @map("kyc_approved_at")\n  /// When the current approval stops being good. Cleared by a rejection.\n  kycExpiresAt  DateTime?   @map("kyc_expires_at")\n\n  // --- invitation lifecycle\n  invitedAt           DateTime? @map("invited_at")\n  invitationExpiresAt DateTime? @map("invitation_expires_at")\n  invitationSentCount Int       @default(0) @map("invitation_sent_count")\n  invitedById         String?   @map("invited_by_id") @db.Uuid\n\n  // --- activity\n  activatedAt DateTime? @map("activated_at")\n  lastLoginAt DateTime? @map("last_login_at")\n  closedAt    DateTime? @map("closed_at")\n\n  createdAt DateTime @default(now()) @map("created_at")\n  updatedAt DateTime @updatedAt @map("updated_at")\n\n  // --- relations\n  invitedBy StaffUser? @relation("InvestorInvitedBy", fields: [invitedById], references: [id], onDelete: SetNull)\n\n  kycSubmissions KycSubmission[]\n\n  @@index([status])\n  @@index([kycStatus])\n  @@index([type, status])\n  @@index([kycExpiresAt])\n  @@index([createdAt])\n  @@map("investors")\n}\n\n/// One attempt at proving who an investor is, and its review.\n///\n/// Carries its own copy of the details and its own documents, so what an\n/// officer signed off is exactly what stays on record. A later change starts\n/// a new submission; a reviewed one is never edited.\n///\n/// At most one submission per investor may be unfinished at a time. That is\n/// enforced in the service, inside the transaction that creates one, because\n/// Prisma cannot express a partial unique index.\nmodel KycSubmission {\n  id String @id @default(uuid()) @db.Uuid\n\n  investorId String @map("investor_id") @db.Uuid\n\n  status KycSubmissionStatus @default(DRAFT)\n\n  /// Copied from the investor when the submission starts, so a submission is\n  /// always read with the rules for the kind of investor it was made for.\n  investorType InvestorType @map("investor_type")\n\n  /// The investor\'s details as submitted: `KycDetails` in @afaq/types,\n  /// validated by `validateKycDetails` before every write. JSON rather than\n  /// columns because an individual and a company have almost nothing in\n  /// common, and a company\'s list of owners is a list.\n  details Json\n\n  riskRating RiskRating? @map("risk_rating")\n\n  // --- who did what, and when. Each step keeps its own columns rather than a\n  // --- single "last actor", because the two-person rule is checked against\n  // --- exactly these.\n  submittedAt        DateTime? @map("submitted_at")\n  /// Set when staff submitted it for the investor; null when the investor did.\n  submittedByStaffId String?   @map("submitted_by_staff_id") @db.Uuid\n\n  verifiedAt       DateTime? @map("verified_at")\n  verifiedById     String?   @map("verified_by_id") @db.Uuid\n  verificationNote String?   @map("verification_note") @db.Text\n\n  changesRequestedAt   DateTime? @map("changes_requested_at")\n  changesRequestedById String?   @map("changes_requested_by_id") @db.Uuid\n  changesRequestedNote String?   @map("changes_requested_note") @db.Text\n\n  /// The final decision: approval or rejection.\n  decidedAt    DateTime? @map("decided_at")\n  decidedById  String?   @map("decided_by_id") @db.Uuid\n  decisionNote String?   @map("decision_note") @db.Text\n\n  /// Set on approval: when this approval stops being good.\n  expiresAt DateTime? @map("expires_at")\n\n  createdAt DateTime @default(now()) @map("created_at")\n  updatedAt DateTime @updatedAt @map("updated_at")\n\n  // --- relations\n  /// Restrict: a submission is part of the investor\'s record and outlives\n  /// nothing — but there is no delete path for an investor who has one, and\n  /// this makes that structural.\n  investor Investor @relation(fields: [investorId], references: [id], onDelete: Restrict)\n\n  submittedByStaff   StaffUser? @relation("KycSubmittedByStaff", fields: [submittedByStaffId], references: [id], onDelete: SetNull)\n  verifiedBy         StaffUser? @relation("KycVerifiedBy", fields: [verifiedById], references: [id], onDelete: SetNull)\n  changesRequestedBy StaffUser? @relation("KycChangesRequestedBy", fields: [changesRequestedById], references: [id], onDelete: SetNull)\n  decidedBy          StaffUser? @relation("KycDecidedBy", fields: [decidedById], references: [id], onDelete: SetNull)\n\n  documents KycDocument[]\n\n  /// An investor\'s own submissions, newest first.\n  @@index([investorId, createdAt])\n  /// The review queues: everything waiting for an officer or a decision.\n  @@index([status, submittedAt])\n  @@map("kyc_submissions")\n}\n\n/// One uploaded file belonging to a submission.\n///\n/// The file itself is in a private Supabase Storage bucket; this row is what\n/// is known about it. The path is built by the API from ids alone — never\n/// from the uploaded file name — and files are only ever handed out through\n/// short-lived signed links.\nmodel KycDocument {\n  id String @id @default(uuid()) @db.Uuid\n\n  submissionId String @map("submission_id") @db.Uuid\n\n  kind KycDocumentKind\n\n  /// For PARTY_ID: which signatory or owner in the submission\'s details.\n  partyKey String? @map("party_key")\n\n  storagePath String @unique @map("storage_path")\n\n  /// As uploaded, for display only. Never used to build a path.\n  fileName  String @map("file_name")\n  mimeType  String @map("mime_type")\n  sizeBytes Int    @map("size_bytes")\n\n  /// SHA-256 of the file, hex. Recorded at upload so a file that changed in\n  /// storage afterwards can be told apart from the one that was reviewed.\n  sha256 String\n\n  status       KycDocumentStatus @default(PENDING)\n  reviewNote   String?           @map("review_note") @db.Text\n  reviewedById String?           @map("reviewed_by_id") @db.Uuid\n  reviewedAt   DateTime?         @map("reviewed_at")\n\n  /// Null when the investor uploaded it themselves.\n  uploadedByStaffId String? @map("uploaded_by_staff_id") @db.Uuid\n\n  /// Set when the uploader took it back while the submission was still\n  /// editable. The row and the file are kept: once a file has been seen it is\n  /// part of the record, and "removed" is a fact about it, not its absence.\n  removedAt DateTime? @map("removed_at")\n\n  createdAt DateTime @default(now()) @map("created_at")\n\n  // --- relations\n  submission KycSubmission @relation(fields: [submissionId], references: [id], onDelete: Restrict)\n\n  uploadedByStaff StaffUser? @relation("KycDocumentUploadedBy", fields: [uploadedByStaffId], references: [id], onDelete: SetNull)\n  reviewedBy      StaffUser? @relation("KycDocumentReviewedBy", fields: [reviewedById], references: [id], onDelete: SetNull)\n\n  @@index([submissionId, kind])\n  @@map("kyc_documents")\n}\n\n/// The compliance values that are business decisions, editable from the\n/// Admin Portal. One row, `id` "global", for the same reasons as\n/// InvestmentSettings.\nmodel ComplianceSettings {\n  id String @id @default("global")\n\n  /// Nobody younger may invest.\n  minimumAge Int @default(18) @map("minimum_age")\n\n  /// How long an approval lasts before the investor is checked again, by the\n  /// risk rating the verifying officer set.\n  reviewMonthsLow    Int @default(36) @map("review_months_low")\n  reviewMonthsMedium Int @default(24) @map("review_months_medium")\n  reviewMonthsHigh   Int @default(12) @map("review_months_high")\n\n  /// The largest KYC upload, in bytes.\n  maxDocumentBytes Int @default(10485760) @map("max_document_bytes")\n\n  /// How long a staff invitation to an investor stays usable.\n  investorInvitationDays Int @default(7) @map("investor_invitation_days")\n\n  updatedById String?  @map("updated_by_id") @db.Uuid\n  createdAt   DateTime @default(now()) @map("created_at")\n  updatedAt   DateTime @updatedAt @map("updated_at")\n\n  updatedBy StaffUser? @relation("ComplianceSettingsUpdatedBy", fields: [updatedById], references: [id], onDelete: SetNull)\n\n  @@map("compliance_settings")\n}\n',
  ],
  [
    'packages/types/src/audit.ts',
    'audit.ts (1/1)',
    "  'OPPORTUNITY',\n] as const;",
    "  'OPPORTUNITY',\n  'INVESTOR',\n  'KYC',\n] as const;",
  ],
  [
    'packages/types/src/index.ts',
    'index.ts (1/1)',
    "export * from './opportunity';\n",
    "export * from './opportunity';\nexport * from './investor';\nexport * from './kyc';\n",
  ],
  [
    'packages/database/src/seed.ts',
    'seed.ts (1/7)',
    " * Seeds the permission catalogue, the eight system roles, Afaq's own nine\n * companies, and the starter investment configuration.\n *",
    " * Seeds the permission catalogue, the eight system roles, Afaq's own nine\n * companies, the starter investment configuration and the compliance settings.\n *",
  ],
  [
    'packages/database/src/seed.ts',
    'seed.ts (2/7)',
    ' *     seed-opportunities.ts for why they are off by default\n *',
    " *     seed-opportunities.ts for why they are off by default\n *   - compliance settings are created if missing and then never altered\n *   - investors and their identity checks are never touched: they are real\n *     people's records, and nothing here invents any\n *",
  ],
  [
    'packages/database/src/seed.ts',
    'seed.ts (3/7)',
    '  annualisedRoi,\n  PERMISSIONS,',
    '  annualisedRoi,\n  COMPLIANCE_DEFAULTS,\n  PERMISSIONS,',
  ],
  [
    'packages/database/src/seed.ts',
    'seed.ts (4/7)',
    '\n    const [',
    "\n    // --- compliance settings -----------------------------------------------\n    //\n    // The same treatment as the investment settings: written once with the\n    // defaults from @afaq/types, then owned by whoever maintains them in the\n    // Admin Portal. Re-running the seed must never quietly shorten somebody's\n    // review period back to a default.\n    const existingCompliance = await prisma.complianceSettings.findUnique({\n      where: { id: 'global' },\n      select: { id: true },\n    });\n\n    if (existingCompliance) {\n      console.log('Compliance:   settings already present, left alone');\n    } else {\n      await prisma.complianceSettings.create({\n        data: {\n          id: 'global',\n          minimumAge: COMPLIANCE_DEFAULTS.minimumAge,\n          reviewMonthsLow: COMPLIANCE_DEFAULTS.reviewMonths.LOW,\n          reviewMonthsMedium: COMPLIANCE_DEFAULTS.reviewMonths.MEDIUM,\n          reviewMonthsHigh: COMPLIANCE_DEFAULTS.reviewMonths.HIGH,\n          maxDocumentBytes: COMPLIANCE_DEFAULTS.maxDocumentBytes,\n          investorInvitationDays: COMPLIANCE_DEFAULTS.investorInvitationDays,\n        },\n      });\n      console.log(\n        `Compliance:   created (minimum age ${COMPLIANCE_DEFAULTS.minimumAge}; reviews every ` +\n          `${COMPLIANCE_DEFAULTS.reviewMonths.LOW}/${COMPLIANCE_DEFAULTS.reviewMonths.MEDIUM}/` +\n          `${COMPLIANCE_DEFAULTS.reviewMonths.HIGH} months for low/medium/high risk)`,\n      );\n    }\n\n    const [",
  ],
  [
    'packages/database/src/seed.ts',
    'seed.ts (5/7)',
    '      opportunityCount,\n    ] = await Promise.all([',
    '      opportunityCount,\n      investorCount,\n    ] = await Promise.all([',
  ],
  [
    'packages/database/src/seed.ts',
    'seed.ts (6/7)',
    '      prisma.investmentOpportunity.count(),\n    ]);',
    '      prisma.investmentOpportunity.count(),\n      prisma.investor.count(),\n    ]);',
  ],
  [
    'packages/database/src/seed.ts',
    'seed.ts (7/7)',
    '    console.log(`  opportunities: ${opportunityCount}`);\n',
    '    console.log(`  opportunities: ${opportunityCount}`);\n    console.log(`  investors:     ${investorCount} (untouched)`);\n',
  ],
  [
    'scripts/write-audit-action-labels.mjs',
    'write-audit-action-labels.mjs (1/2)',
    "    OPPORTUNITY: 'Opportunities',\n  },",
    "    OPPORTUNITY: 'Opportunities',\n    INVESTOR: 'Investors',\n    KYC: 'Identity checks',\n  },",
  ],
  [
    'scripts/write-audit-action-labels.mjs',
    'write-audit-action-labels.mjs (2/2)',
    "    OPPORTUNITY: 'الفرص الاستثمارية',\n  },",
    "    OPPORTUNITY: 'الفرص الاستثمارية',\n    INVESTOR: 'المستثمرون',\n    KYC: 'التحقق من الهوية',\n  },",
  ],
  [
    'apps/admin/src/components/audit/audit-entry-drawer.tsx',
    'audit-entry-drawer.tsx (1/1)',
    "  OPPORTUNITY: 'info',\n};",
    "  OPPORTUNITY: 'info',\n  // Account changes are housekeeping; identity decisions are compliance\n  // calls and get the warning tint, like role and permission changes.\n  INVESTOR: 'info',\n  KYC: 'warning',\n};",
  ],
  [
    'apps/admin/src/components/audit/audit-log-table.tsx',
    'audit-log-table.tsx (1/1)',
    "  OPPORTUNITY: 'info',\n};",
    "  OPPORTUNITY: 'info',\n  // Account changes are housekeeping; identity decisions are compliance\n  // calls and get the warning tint, like role and permission changes.\n  INVESTOR: 'info',\n  KYC: 'warning',\n};",
  ],
];

const files = new Map();
const crlf = new Set();
const plan = [];

for (const [file, name, from, to] of EDITS) {
  const path = join(ROOT, file);
  if (!files.has(path)) {
    const raw = readFileSync(path, 'utf8');
    if (raw.includes('\r\n')) crlf.add(path);
    files.set(path, raw.replace(/\r\n/g, '\n'));
  }
  const source = files.get(path);

  // Already applied when the new text is there and the old text is either
  // gone, or only present because it sits inside the new text — the shape of
  // an edit that adds lines. (A deletion leaves its new text inside its old,
  // so the old text being present is what says it has not been applied.)
  const applied = source.includes(to) && (!source.includes(from) || to.includes(from));

  if (applied) {
    plan.push(`skip   ${name} (already applied)`);
    continue;
  }

  const hits = source.split(from).length - 1;
  if (hits !== 1) {
    console.error(`STOPPED: ${name} expected its text once in ${file}, found it ${hits} times.`);
    console.error('Nothing has been written. Check that file matches the end of Phase 22.');
    process.exit(1);
  }

  files.set(path, source.replace(from, to));
  plan.push(`apply  ${name}`);
}

for (const [path, source] of files) {
  writeFileSync(path, crlf.has(path) ? source.replace(/\n/g, '\r\n') : source, 'utf8');
}

for (const line of plan) console.log(line);
console.log('\nDone. Next: node scripts/write-audit-action-labels.mjs');
