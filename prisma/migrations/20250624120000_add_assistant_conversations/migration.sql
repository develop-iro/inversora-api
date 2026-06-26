CREATE TABLE "assistant_conversations" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "surface" TEXT NOT NULL,
    "locale" TEXT NOT NULL DEFAULT 'es',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "lastMessageAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "assistant_conversations_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "assistant_messages" (
    "id" TEXT NOT NULL,
    "conversationId" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "intent" TEXT,
    "source" TEXT,
    "runtime" TEXT,
    "promptVersion" TEXT,
    "relatedFundIsins" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "metadataJson" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "assistant_messages_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "assistant_conversations_sessionId_key" ON "assistant_conversations"("sessionId");
CREATE INDEX "assistant_conversations_lastMessageAt_idx" ON "assistant_conversations"("lastMessageAt");
CREATE INDEX "assistant_messages_conversationId_createdAt_idx" ON "assistant_messages"("conversationId", "createdAt");

ALTER TABLE "assistant_messages"
ADD CONSTRAINT "assistant_messages_conversationId_fkey"
FOREIGN KEY ("conversationId") REFERENCES "assistant_conversations"("id")
ON DELETE CASCADE ON UPDATE CASCADE;
