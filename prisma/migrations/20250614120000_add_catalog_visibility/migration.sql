-- CreateEnum
CREATE TYPE "CatalogVisibility" AS ENUM ('visible', 'quarantined', 'blocked');

-- AlterTable
ALTER TABLE "funds" ADD COLUMN "catalogVisibility" "CatalogVisibility" NOT NULL DEFAULT 'visible';

-- CreateIndex
CREATE INDEX "funds_catalogVisibility_idx" ON "funds"("catalogVisibility");

-- Backfill: quarantine funds missing minimum catalog data (RN-03 / RN-05)
UPDATE "funds"
SET "catalogVisibility" = 'quarantined'
WHERE "catalogVisibility" = 'visible'
  AND (
    "isin" IS NULL
    OR TRIM("benchmark") = ''
    OR "benchmark" IS NULL
    OR "ter" IS NULL
    OR "score" IS NULL
    OR TRIM("name") = ''
  );

-- CreateTable
CREATE TABLE "fund_catalog_visibility_audits" (
    "id" TEXT NOT NULL,
    "fundId" TEXT NOT NULL,
    "previousState" "CatalogVisibility" NOT NULL,
    "newState" "CatalogVisibility" NOT NULL,
    "reason" TEXT NOT NULL,
    "actor" TEXT NOT NULL DEFAULT 'system',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "fund_catalog_visibility_audits_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "fund_catalog_visibility_audits_fundId_createdAt_idx" ON "fund_catalog_visibility_audits"("fundId", "createdAt");

-- AddForeignKey
ALTER TABLE "fund_catalog_visibility_audits" ADD CONSTRAINT "fund_catalog_visibility_audits_fundId_fkey" FOREIGN KEY ("fundId") REFERENCES "funds"("id") ON DELETE CASCADE ON UPDATE CASCADE;
