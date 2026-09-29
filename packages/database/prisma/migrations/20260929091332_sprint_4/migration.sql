-- CreateEnum
CREATE TYPE "InvestmentMode" AS ENUM ('LOCKED', 'UNLOCKED');

-- CreateEnum
CREATE TYPE "RoiBasis" AS ENUM ('MONTHLY', 'QUARTERLY', 'ANNUAL');

-- CreateEnum
CREATE TYPE "PayoutFrequency" AS ENUM ('MONTHLY', 'QUARTERLY', 'SEMI_ANNUAL', 'ANNUAL', 'ON_MATURITY');

-- CreateEnum
CREATE TYPE "RuleSetStatus" AS ENUM ('DRAFT', 'ACTIVE', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "RuleSetScope" AS ENUM ('GLOBAL', 'COMPANY');

-- AlterEnum
ALTER TYPE "AuditCategory" ADD VALUE 'INVESTMENT_RULE';

-- CreateTable
CREATE TABLE "investment_settings" (
    "id" TEXT NOT NULL DEFAULT 'global',
    "currency" TEXT NOT NULL DEFAULT 'AED',
    "minimum_investment" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "max_roi_percent" DECIMAL(6,3) NOT NULL DEFAULT 10,
    "max_roi_basis" "RoiBasis" NOT NULL DEFAULT 'MONTHLY',
    "default_notice_period_days" INTEGER NOT NULL DEFAULT 90,
    "require_step_up_to_publish" BOOLEAN NOT NULL DEFAULT true,
    "updated_by_id" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "investment_settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "investment_rule_sets" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "scope" "RuleSetScope" NOT NULL DEFAULT 'GLOBAL',
    "company_id" UUID,
    "scope_key" TEXT NOT NULL,
    "status" "RuleSetStatus" NOT NULL DEFAULT 'DRAFT',
    "roi_basis" "RoiBasis" NOT NULL DEFAULT 'MONTHLY',
    "notes" TEXT,
    "effective_from" TIMESTAMP(3),
    "effective_to" TIMESTAMP(3),
    "active_key" TEXT,
    "created_by_id" UUID,
    "published_by_id" UUID,
    "published_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "investment_rule_sets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "investment_tiers" (
    "id" UUID NOT NULL,
    "rule_set_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "min_amount" DECIMAL(18,2) NOT NULL,
    "max_amount" DECIMAL(18,2),
    "display_order" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "investment_tiers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "investment_tier_options" (
    "id" UUID NOT NULL,
    "tier_id" UUID NOT NULL,
    "mode" "InvestmentMode" NOT NULL,
    "roi_percent" DECIMAL(6,3) NOT NULL,
    "payout_frequency" "PayoutFrequency" NOT NULL DEFAULT 'MONTHLY',
    "min_term_months" INTEGER,
    "max_term_months" INTEGER,
    "notice_period_days" INTEGER NOT NULL DEFAULT 0,
    "earns_during_notice" BOOLEAN NOT NULL DEFAULT false,
    "is_enabled" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "investment_tier_options_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "investment_rule_sets_active_key_key" ON "investment_rule_sets"("active_key");

-- CreateIndex
CREATE INDEX "investment_rule_sets_scope_status_idx" ON "investment_rule_sets"("scope", "status");

-- CreateIndex
CREATE INDEX "investment_rule_sets_company_id_status_idx" ON "investment_rule_sets"("company_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "investment_rule_sets_scope_key_version_key" ON "investment_rule_sets"("scope_key", "version");

-- CreateIndex
CREATE INDEX "investment_tiers_rule_set_id_min_amount_idx" ON "investment_tiers"("rule_set_id", "min_amount");

-- CreateIndex
CREATE UNIQUE INDEX "investment_tiers_rule_set_id_display_order_key" ON "investment_tiers"("rule_set_id", "display_order");

-- CreateIndex
CREATE UNIQUE INDEX "investment_tier_options_tier_id_mode_key" ON "investment_tier_options"("tier_id", "mode");

-- AddForeignKey
ALTER TABLE "investment_settings" ADD CONSTRAINT "investment_settings_updated_by_id_fkey" FOREIGN KEY ("updated_by_id") REFERENCES "staff_users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "investment_rule_sets" ADD CONSTRAINT "investment_rule_sets_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "investment_rule_sets" ADD CONSTRAINT "investment_rule_sets_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "staff_users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "investment_rule_sets" ADD CONSTRAINT "investment_rule_sets_published_by_id_fkey" FOREIGN KEY ("published_by_id") REFERENCES "staff_users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "investment_tiers" ADD CONSTRAINT "investment_tiers_rule_set_id_fkey" FOREIGN KEY ("rule_set_id") REFERENCES "investment_rule_sets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "investment_tier_options" ADD CONSTRAINT "investment_tier_options_tier_id_fkey" FOREIGN KEY ("tier_id") REFERENCES "investment_tiers"("id") ON DELETE CASCADE ON UPDATE CASCADE;
