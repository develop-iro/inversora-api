-- CreateEnum
CREATE TYPE "FundAllocationCategory" AS ENUM ('sectorial', 'regional', 'asset-allocation', 'capitalization', 'portfolio');

-- CreateTable
CREATE TABLE "fund_holdings" (
    "id" TEXT NOT NULL,
    "fundId" TEXT NOT NULL,
    "asOf" DATE NOT NULL,
    "rank" INTEGER NOT NULL,
    "asset" TEXT,
    "name" TEXT NOT NULL,
    "isin" TEXT,
    "weightPercentage" DECIMAL(8,4) NOT NULL,
    "marketValue" DECIMAL(20,2),
    "sharesNumber" DECIMAL(20,6),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "fund_holdings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fund_allocations" (
    "id" TEXT NOT NULL,
    "fundId" TEXT NOT NULL,
    "asOf" DATE NOT NULL,
    "category" "FundAllocationCategory" NOT NULL,
    "label" TEXT NOT NULL,
    "weight" DECIMAL(8,4) NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "fund_allocations_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "fund_holdings_fundId_asOf_idx" ON "fund_holdings"("fundId", "asOf");

-- CreateIndex
CREATE UNIQUE INDEX "fund_holdings_fundId_asOf_rank_key" ON "fund_holdings"("fundId", "asOf", "rank");

-- CreateIndex
CREATE INDEX "fund_allocations_fundId_asOf_category_idx" ON "fund_allocations"("fundId", "asOf", "category");

-- CreateIndex
CREATE UNIQUE INDEX "fund_allocations_fundId_asOf_category_label_key" ON "fund_allocations"("fundId", "asOf", "category", "label");

-- AddForeignKey
ALTER TABLE "fund_holdings" ADD CONSTRAINT "fund_holdings_fundId_fkey" FOREIGN KEY ("fundId") REFERENCES "funds"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fund_allocations" ADD CONSTRAINT "fund_allocations_fundId_fkey" FOREIGN KEY ("fundId") REFERENCES "funds"("id") ON DELETE CASCADE ON UPDATE CASCADE;
