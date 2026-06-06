-- CreateTable
CREATE TABLE "fund_prices" (
    "id" TEXT NOT NULL,
    "fundId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "open" DECIMAL(18,6) NOT NULL,
    "high" DECIMAL(18,6) NOT NULL,
    "low" DECIMAL(18,6) NOT NULL,
    "close" DECIMAL(18,6) NOT NULL,
    "volume" BIGINT,
    "change" DECIMAL(18,6),
    "changePercent" DECIMAL(10,6),
    "vwap" DECIMAL(18,6),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "fund_prices_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "fund_prices_fundId_date_idx" ON "fund_prices"("fundId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "fund_prices_fundId_date_key" ON "fund_prices"("fundId", "date");

-- AddForeignKey
ALTER TABLE "fund_prices" ADD CONSTRAINT "fund_prices_fundId_fkey" FOREIGN KEY ("fundId") REFERENCES "funds"("id") ON DELETE CASCADE ON UPDATE CASCADE;
