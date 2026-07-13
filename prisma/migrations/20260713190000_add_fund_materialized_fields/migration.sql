-- AlterTable
ALTER TABLE "funds" ADD COLUMN "return1y" DECIMAL(10,4),
ADD COLUMN "return3y" DECIMAL(10,4),
ADD COLUMN "returnYtd" DECIMAL(10,4),
ADD COLUMN "returnAsOf" DATE,
ADD COLUMN "scoreBreakdown" JSONB,
ADD COLUMN "peerGroupKey" TEXT,
ADD COLUMN "peerRank" INTEGER;

-- CreateIndex
CREATE INDEX "funds_peerGroupKey_score_idx" ON "funds"("peerGroupKey", "score" DESC);

-- CreateIndex
CREATE INDEX "funds_return1y_idx" ON "funds"("return1y");

-- CreateIndex
CREATE INDEX "funds_return3y_idx" ON "funds"("return3y");
