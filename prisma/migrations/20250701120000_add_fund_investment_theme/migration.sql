-- CreateEnum
CREATE TYPE "InvestmentTheme" AS ENUM (
  'global-equity',
  'us-equity',
  'europe-equity',
  'emerging-equity',
  'fixed-income',
  'multi-asset',
  'technology',
  'esg',
  'sector-other',
  'unclassified'
);

-- AlterTable
ALTER TABLE "funds" ADD COLUMN "assetClass" TEXT;
ALTER TABLE "funds" ADD COLUMN "domicile" TEXT;
ALTER TABLE "funds" ADD COLUMN "investmentTheme" "InvestmentTheme";

-- CreateIndex
CREATE INDEX "funds_investmentTheme_idx" ON "funds"("investmentTheme");
