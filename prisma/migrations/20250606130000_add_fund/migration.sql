-- CreateEnum
CREATE TYPE "FundProvider" AS ENUM ('financial-modeling-prep');

-- CreateEnum
CREATE TYPE "FundCategory" AS ENUM ('index');

-- CreateTable
CREATE TABLE "funds" (
    "id" TEXT NOT NULL,
    "symbol" TEXT NOT NULL,
    "isin" TEXT,
    "name" TEXT NOT NULL,
    "provider" "FundProvider" NOT NULL,
    "category" "FundCategory" NOT NULL,
    "currency" CHAR(3) NOT NULL,
    "benchmark" TEXT,
    "volatility" DECIMAL(8,4),
    "drawdown" DECIMAL(8,4),
    "ter" DECIMAL(8,4),
    "aum" DECIMAL(20,2),
    "per" DECIMAL(10,4),
    "dividendYield" DECIMAL(8,4),
    "trackingError" DECIMAL(8,4),
    "riskLevel" INTEGER,
    "score" DECIMAL(5,2),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "funds_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "funds_isin_key" ON "funds"("isin");

-- CreateIndex
CREATE UNIQUE INDEX "funds_symbol_provider_key" ON "funds"("symbol", "provider");
