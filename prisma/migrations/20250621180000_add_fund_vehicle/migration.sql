-- CreateEnum
CREATE TYPE "FundVehicleType" AS ENUM ('etf', 'mutual-fund');

-- AlterTable
ALTER TABLE "funds" ADD COLUMN "vehicle" "FundVehicleType" NOT NULL DEFAULT 'etf';
