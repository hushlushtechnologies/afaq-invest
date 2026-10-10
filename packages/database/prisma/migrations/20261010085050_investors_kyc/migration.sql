-- CreateEnum
CREATE TYPE "OpportunityStatus" AS ENUM ('DRAFT', 'OPEN', 'SUSPENDED', 'FULLY_FUNDED', 'CLOSED', 'CANCELLED');

-- AlterEnum
ALTER TYPE "AuditCategory" ADD VALUE 'OPPORTUNITY';

-- CreateTable
CREATE TABLE "investment_opportunities" (
    "id" UUID NOT NULL,
    "slug" TEXT NOT NULL,
    "company_id" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "summary" TEXT,
    "description" TEXT,
    "status" "OpportunityStatus" NOT NULL DEFAULT 'DRAFT',
    "cover_image_url" TEXT,
    "target_amount" DECIMAL(18,2) NOT NULL,
    "committed_amount" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "opens_at" TIMESTAMP(3),
    "closes_at" TIMESTAMP(3),
    "closed_at" TIMESTAMP(3),
    "is_featured" BOOLEAN NOT NULL DEFAULT false,
    "display_order" INTEGER NOT NULL DEFAULT 0,
    "rule_set_id" UUID,
    "created_by_id" UUID,
    "opened_by_id" UUID,
    "closed_by_id" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "investment_opportunities_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "investment_opportunities_slug_key" ON "investment_opportunities"("slug");

-- CreateIndex
CREATE INDEX "investment_opportunities_company_id_status_idx" ON "investment_opportunities"("company_id", "status");

-- CreateIndex
CREATE INDEX "investment_opportunities_status_is_featured_display_order_idx" ON "investment_opportunities"("status", "is_featured", "display_order");

-- CreateIndex
CREATE INDEX "investment_opportunities_rule_set_id_idx" ON "investment_opportunities"("rule_set_id");

-- CreateIndex
CREATE INDEX "investment_opportunities_opens_at_closes_at_idx" ON "investment_opportunities"("opens_at", "closes_at");

-- AddForeignKey
ALTER TABLE "investment_opportunities" ADD CONSTRAINT "investment_opportunities_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "investment_opportunities" ADD CONSTRAINT "investment_opportunities_rule_set_id_fkey" FOREIGN KEY ("rule_set_id") REFERENCES "investment_rule_sets"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "investment_opportunities" ADD CONSTRAINT "investment_opportunities_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "staff_users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "investment_opportunities" ADD CONSTRAINT "investment_opportunities_opened_by_id_fkey" FOREIGN KEY ("opened_by_id") REFERENCES "staff_users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "investment_opportunities" ADD CONSTRAINT "investment_opportunities_closed_by_id_fkey" FOREIGN KEY ("closed_by_id") REFERENCES "staff_users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
