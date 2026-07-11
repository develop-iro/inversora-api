-- CreateTable
CREATE TABLE "analytics_events" (
    "id" TEXT NOT NULL,
    "event" TEXT NOT NULL,
    "surface" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "occurredAt" TIMESTAMP(3) NOT NULL,
    "properties" JSONB,
    "appEnv" TEXT,
    "appVersion" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "analytics_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "analytics_events_event_occurredAt_idx" ON "analytics_events"("event", "occurredAt");

-- CreateIndex
CREATE INDEX "analytics_events_sessionId_occurredAt_idx" ON "analytics_events"("sessionId", "occurredAt");

-- CreateIndex
CREATE INDEX "analytics_events_surface_occurredAt_idx" ON "analytics_events"("surface", "occurredAt");

-- Learn funnel: step views per day
CREATE OR REPLACE VIEW analytics_learn_step_views_daily AS
SELECT
    date_trunc('day', "occurredAt") AS day,
    properties ->> 'stepId' AS step_id,
    COUNT(*)::bigint AS view_count
FROM analytics_events
WHERE event = 'learn_step_viewed'
GROUP BY 1, 2
ORDER BY 1 DESC, 3 DESC;

-- Learn completion rate (started vs completed per day)
CREATE OR REPLACE VIEW analytics_learn_completion_daily AS
SELECT
    date_trunc('day', "occurredAt") AS day,
    COUNT(*) FILTER (WHERE event = 'learn_started')::bigint AS started_count,
    COUNT(*) FILTER (WHERE event = 'learn_completed')::bigint AS completed_count
FROM analytics_events
WHERE event IN ('learn_started', 'learn_completed')
GROUP BY 1
ORDER BY 1 DESC;

-- Screen views per day
CREATE OR REPLACE VIEW analytics_screen_views_daily AS
SELECT
    date_trunc('day', "occurredAt") AS day,
    surface,
    COUNT(*)::bigint AS view_count
FROM analytics_events
WHERE event = 'screen_view'
GROUP BY 1, 2
ORDER BY 1 DESC, 3 DESC;

-- Profile distribution on completion
CREATE OR REPLACE VIEW analytics_learn_profile_distribution AS
SELECT
    properties ->> 'riskOrientation' AS risk_orientation,
    COUNT(*)::bigint AS completion_count
FROM analytics_events
WHERE event = 'learn_completed'
  AND properties ->> 'riskOrientation' IS NOT NULL
GROUP BY 1
ORDER BY 2 DESC;
