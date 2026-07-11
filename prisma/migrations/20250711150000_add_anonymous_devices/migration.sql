-- CreateTable
CREATE TABLE "anonymous_devices" (
    "id" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "platform" TEXT NOT NULL,
    "appVersion" TEXT,
    "firstSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastSeenAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "anonymous_devices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "anonymous_educational_profiles" (
    "id" TEXT NOT NULL,
    "deviceId" TEXT NOT NULL,
    "knowledgeLevel" TEXT NOT NULL,
    "riskOrientation" TEXT NOT NULL,
    "investmentHorizon" TEXT NOT NULL,
    "investorStyle" TEXT NOT NULL,
    "financialReadiness" TEXT NOT NULL,
    "learningGoal" TEXT NOT NULL,
    "profileVersion" INTEGER NOT NULL,
    "completedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "anonymous_educational_profiles_pkey" PRIMARY KEY ("id")
);

-- AlterTable
ALTER TABLE "analytics_events" ADD COLUMN "deviceId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "anonymous_devices_tokenHash_key" ON "anonymous_devices"("tokenHash");

-- CreateIndex
CREATE INDEX "anonymous_devices_lastSeenAt_idx" ON "anonymous_devices"("lastSeenAt");

-- CreateIndex
CREATE UNIQUE INDEX "anonymous_educational_profiles_deviceId_key" ON "anonymous_educational_profiles"("deviceId");

-- CreateIndex
CREATE INDEX "anonymous_educational_profiles_completedAt_idx" ON "anonymous_educational_profiles"("completedAt");

-- CreateIndex
CREATE INDEX "anonymous_educational_profiles_riskOrientation_completedAt_idx" ON "anonymous_educational_profiles"("riskOrientation", "completedAt");

-- CreateIndex
CREATE INDEX "analytics_events_deviceId_occurredAt_idx" ON "analytics_events"("deviceId", "occurredAt");

-- AddForeignKey
ALTER TABLE "analytics_events" ADD CONSTRAINT "analytics_events_deviceId_fkey" FOREIGN KEY ("deviceId") REFERENCES "anonymous_devices"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "anonymous_educational_profiles" ADD CONSTRAINT "anonymous_educational_profiles_deviceId_fkey" FOREIGN KEY ("deviceId") REFERENCES "anonymous_devices"("id") ON DELETE CASCADE ON UPDATE CASCADE;
