-- CreateTable
CREATE TABLE "product_feedback" (
    "id" TEXT NOT NULL,
    "clarity" TEXT NOT NULL,
    "wouldReturn" TEXT NOT NULL,
    "message" TEXT,
    "surface" TEXT NOT NULL DEFAULT 'feedback',
    "deviceId" TEXT,
    "appEnv" TEXT,
    "appVersion" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "product_feedback_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "product_feedback_createdAt_idx" ON "product_feedback"("createdAt");

-- CreateIndex
CREATE INDEX "product_feedback_clarity_createdAt_idx" ON "product_feedback"("clarity", "createdAt");

-- CreateIndex
CREATE INDEX "product_feedback_wouldReturn_createdAt_idx" ON "product_feedback"("wouldReturn", "createdAt");

-- CreateIndex
CREATE INDEX "product_feedback_deviceId_createdAt_idx" ON "product_feedback"("deviceId", "createdAt");

-- AddForeignKey
ALTER TABLE "product_feedback" ADD CONSTRAINT "product_feedback_deviceId_fkey" FOREIGN KEY ("deviceId") REFERENCES "anonymous_devices"("id") ON DELETE SET NULL ON UPDATE CASCADE;
