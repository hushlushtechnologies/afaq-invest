-- CreateEnum
CREATE TYPE "InvestorType" AS ENUM ('INDIVIDUAL', 'CORPORATE');

-- CreateEnum
CREATE TYPE "InvestorSource" AS ENUM ('SELF_REGISTERED', 'STAFF_INVITED');

-- CreateEnum
CREATE TYPE "InvestorStatus" AS ENUM ('INVITED', 'ACTIVE', 'SUSPENDED', 'CLOSED');

-- CreateEnum
CREATE TYPE "KycStoredStanding" AS ENUM ('NOT_STARTED', 'IN_PROGRESS', 'PENDING_REVIEW', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "RiskRating" AS ENUM ('LOW', 'MEDIUM', 'HIGH');

-- CreateEnum
CREATE TYPE "KycSubmissionStatus" AS ENUM ('DRAFT', 'SUBMITTED', 'VERIFIED', 'CHANGES_REQUESTED', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "KycDocumentKind" AS ENUM ('EMIRATES_ID_FRONT', 'EMIRATES_ID_BACK', 'PASSPORT', 'PROOF_OF_ADDRESS', 'TRADE_LICENCE', 'MEMORANDUM_OF_ASSOCIATION', 'PARTY_ID', 'SOURCE_OF_FUNDS', 'OTHER');

-- CreateEnum
CREATE TYPE "KycDocumentStatus" AS ENUM ('PENDING', 'ACCEPTED', 'REJECTED');

-- AlterEnum
ALTER TYPE "AuditCategory" ADD VALUE 'INVESTOR';

-- CreateTable
CREATE TABLE "investors" (
    "id" UUID NOT NULL,
    "number" SERIAL NOT NULL,
    "auth_user_id" UUID,
    "type" "InvestorType" NOT NULL,
    "source" "InvestorSource" NOT NULL DEFAULT 'SELF_REGISTERED',
    "email" TEXT NOT NULL,
    "display_name" TEXT NOT NULL,
    "phone" TEXT,
    "country_of_residence" TEXT,
    "preferred_locale" TEXT NOT NULL DEFAULT 'en',
    "status" "InvestorStatus" NOT NULL DEFAULT 'INVITED',
    "kyc_status" "KycStoredStanding" NOT NULL DEFAULT 'NOT_STARTED',
    "risk_rating" "RiskRating",
    "kyc_approved_at" TIMESTAMP(3),
    "kyc_expires_at" TIMESTAMP(3),
    "invited_at" TIMESTAMP(3),
    "invitation_expires_at" TIMESTAMP(3),
    "invitation_sent_count" INTEGER NOT NULL DEFAULT 0,
    "invited_by_id" UUID,
    "activated_at" TIMESTAMP(3),
    "closed_at" TIMESTAMP(3),
    "last_login_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "investors_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "kyc_submissions" (
    "id" UUID NOT NULL,
    "investor_id" UUID NOT NULL,
    "investor_type" "InvestorType" NOT NULL,
    "status" "KycSubmissionStatus" NOT NULL DEFAULT 'DRAFT',
    "risk_rating" "RiskRating",
    "details" JSONB,
    "submitted_at" TIMESTAMP(3),
    "submitted_by_staff_id" UUID,
    "verified_at" TIMESTAMP(3),
    "verified_by_id" UUID,
    "verification_note" TEXT,
    "decided_at" TIMESTAMP(3),
    "decided_by_id" UUID,
    "decision_note" TEXT,
    "changes_requested_note" TEXT,
    "expires_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "kyc_submissions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "kyc_documents" (
    "id" UUID NOT NULL,
    "submission_id" UUID NOT NULL,
    "kind" "KycDocumentKind" NOT NULL,
    "party_key" TEXT,
    "file_name" TEXT NOT NULL,
    "mime_type" TEXT NOT NULL,
    "size_bytes" INTEGER NOT NULL,
    "storage_path" TEXT NOT NULL,
    "status" "KycDocumentStatus" NOT NULL DEFAULT 'PENDING',
    "review_note" TEXT,
    "reviewed_at" TIMESTAMP(3),
    "reviewed_by_id" UUID,
    "uploaded_by_staff_id" UUID,
    "removed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "kyc_documents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "compliance_settings" (
    "id" TEXT NOT NULL DEFAULT 'global',
    "minimum_age" INTEGER NOT NULL DEFAULT 18,
    "review_months_low" INTEGER NOT NULL DEFAULT 36,
    "review_months_medium" INTEGER NOT NULL DEFAULT 24,
    "review_months_high" INTEGER NOT NULL DEFAULT 12,
    "max_document_bytes" INTEGER NOT NULL DEFAULT 10485760,
    "investor_invitation_days" INTEGER NOT NULL DEFAULT 7,
    "updated_by_id" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "compliance_settings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "investors_number_key" ON "investors"("number");

-- CreateIndex
CREATE UNIQUE INDEX "investors_auth_user_id_key" ON "investors"("auth_user_id");

-- CreateIndex
CREATE UNIQUE INDEX "investors_email_key" ON "investors"("email");

-- CreateIndex
CREATE INDEX "investors_status_created_at_idx" ON "investors"("status", "created_at");

-- CreateIndex
CREATE INDEX "investors_type_status_idx" ON "investors"("type", "status");

-- CreateIndex
CREATE INDEX "investors_source_idx" ON "investors"("source");

-- CreateIndex
CREATE INDEX "investors_kyc_status_kyc_expires_at_idx" ON "investors"("kyc_status", "kyc_expires_at");

-- CreateIndex
CREATE INDEX "investors_risk_rating_idx" ON "investors"("risk_rating");

-- CreateIndex
CREATE INDEX "investors_display_name_idx" ON "investors"("display_name");

-- CreateIndex
CREATE INDEX "kyc_submissions_investor_id_created_at_idx" ON "kyc_submissions"("investor_id", "created_at");

-- CreateIndex
CREATE INDEX "kyc_submissions_status_submitted_at_idx" ON "kyc_submissions"("status", "submitted_at");

-- CreateIndex
CREATE INDEX "kyc_submissions_risk_rating_idx" ON "kyc_submissions"("risk_rating");

-- CreateIndex
CREATE INDEX "kyc_documents_submission_id_status_idx" ON "kyc_documents"("submission_id", "status");

-- CreateIndex
CREATE INDEX "kyc_documents_submission_id_kind_idx" ON "kyc_documents"("submission_id", "kind");

-- CreateIndex
CREATE INDEX "kyc_documents_uploaded_by_staff_id_idx" ON "kyc_documents"("uploaded_by_staff_id");

-- AddForeignKey
ALTER TABLE "investors" ADD CONSTRAINT "investors_invited_by_id_fkey" FOREIGN KEY ("invited_by_id") REFERENCES "staff_users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "kyc_submissions" ADD CONSTRAINT "kyc_submissions_investor_id_fkey" FOREIGN KEY ("investor_id") REFERENCES "investors"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "kyc_submissions" ADD CONSTRAINT "kyc_submissions_submitted_by_staff_id_fkey" FOREIGN KEY ("submitted_by_staff_id") REFERENCES "staff_users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "kyc_submissions" ADD CONSTRAINT "kyc_submissions_verified_by_id_fkey" FOREIGN KEY ("verified_by_id") REFERENCES "staff_users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "kyc_submissions" ADD CONSTRAINT "kyc_submissions_decided_by_id_fkey" FOREIGN KEY ("decided_by_id") REFERENCES "staff_users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "kyc_documents" ADD CONSTRAINT "kyc_documents_submission_id_fkey" FOREIGN KEY ("submission_id") REFERENCES "kyc_submissions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "kyc_documents" ADD CONSTRAINT "kyc_documents_reviewed_by_id_fkey" FOREIGN KEY ("reviewed_by_id") REFERENCES "staff_users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "kyc_documents" ADD CONSTRAINT "kyc_documents_uploaded_by_staff_id_fkey" FOREIGN KEY ("uploaded_by_staff_id") REFERENCES "staff_users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "compliance_settings" ADD CONSTRAINT "compliance_settings_updated_by_id_fkey" FOREIGN KEY ("updated_by_id") REFERENCES "staff_users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
