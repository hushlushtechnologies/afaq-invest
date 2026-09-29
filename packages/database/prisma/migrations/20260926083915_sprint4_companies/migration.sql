-- CreateEnum
CREATE TYPE "CompanyType" AS ENUM ('INTERNAL', 'THIRD_PARTY');

-- CreateEnum
CREATE TYPE "CompanyStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'SUSPENDED');

-- CreateEnum
CREATE TYPE "CompanyVerification" AS ENUM ('NOT_REQUIRED', 'PENDING', 'UNDER_REVIEW', 'VERIFIED', 'REJECTED');

-- AlterEnum
ALTER TYPE "AuditCategory" ADD VALUE 'COMPANY';

-- CreateTable
CREATE TABLE "companies" (
    "id" UUID NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "legal_name" TEXT,
    "type" "CompanyType" NOT NULL,
    "status" "CompanyStatus" NOT NULL DEFAULT 'ACTIVE',
    "verification" "CompanyVerification" NOT NULL DEFAULT 'NOT_REQUIRED',
    "sector" TEXT NOT NULL,
    "description" TEXT,
    "logo_url" TEXT,
    "cover_image_url" TEXT,
    "website" TEXT,
    "contact_email" TEXT,
    "contact_phone" TEXT,
    "is_featured" BOOLEAN NOT NULL DEFAULT false,
    "display_order" INTEGER NOT NULL DEFAULT 0,
    "created_by_id" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "companies_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "companies_slug_key" ON "companies"("slug");

-- CreateIndex
CREATE INDEX "companies_status_is_featured_display_order_idx" ON "companies"("status", "is_featured", "display_order");

-- CreateIndex
CREATE INDEX "companies_type_status_idx" ON "companies"("type", "status");

-- CreateIndex
CREATE INDEX "companies_sector_idx" ON "companies"("sector");

-- AddForeignKey
ALTER TABLE "companies" ADD CONSTRAINT "companies_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "staff_users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
