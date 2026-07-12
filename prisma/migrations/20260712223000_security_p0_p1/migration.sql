ALTER TABLE "assistant_conversations"
ADD COLUMN "deviceId" TEXT;

ALTER TABLE "assistant_conversations"
ADD CONSTRAINT "assistant_conversations_deviceId_fkey"
FOREIGN KEY ("deviceId") REFERENCES "anonymous_devices"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "assistant_conversations_deviceId_lastMessageAt_idx"
ON "assistant_conversations"("deviceId", "lastMessageAt");

CREATE TABLE "assistant_llm_usage_counters" (
  "id" TEXT NOT NULL,
  "periodKey" TEXT NOT NULL,
  "count" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "assistant_llm_usage_counters_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "assistant_llm_usage_counters_periodKey_key"
ON "assistant_llm_usage_counters"("periodKey");
