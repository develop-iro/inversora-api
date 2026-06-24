-- CreateTable
CREATE TABLE "assistant_response_cache" (
    "id" TEXT NOT NULL,
    "cacheKey" TEXT NOT NULL,
    "intent" TEXT NOT NULL,
    "normalizedQuery" TEXT NOT NULL,
    "fundIsin" TEXT,
    "scoreVersion" TEXT NOT NULL,
    "promptVersion" TEXT NOT NULL,
    "locale" TEXT NOT NULL DEFAULT 'es',
    "responseJson" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "assistant_response_cache_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "assistant_response_cache_cacheKey_key" ON "assistant_response_cache"("cacheKey");

-- CreateIndex
CREATE INDEX "assistant_response_cache_intent_normalizedQuery_idx" ON "assistant_response_cache"("intent", "normalizedQuery");

-- CreateIndex
CREATE INDEX "assistant_response_cache_expiresAt_idx" ON "assistant_response_cache"("expiresAt");
