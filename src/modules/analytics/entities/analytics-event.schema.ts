import { z } from 'zod';

import { ANALYTICS_EVENT_NAMES } from './analytics-event-names';

/** Anonymous analytics event payload accepted by `POST /analytics/events`. */
export const analyticsEventSchema = z.object({
  event: z.enum(ANALYTICS_EVENT_NAMES),
  surface: z.string().trim().min(1).max(120),
  timestamp: z.string().min(1),
  sessionId: z.string().trim().min(8).max(80),
  deviceId: z.string().trim().min(1).max(80).optional(),
  appEnv: z.enum(['local', 'qa', 'pro']).optional(),
  appVersion: z.string().trim().min(1).max(32).optional(),
  properties: z
    .record(z.string(), z.union([z.string(), z.number(), z.boolean()]))
    .optional(),
});

export type AnalyticsEvent = z.infer<typeof analyticsEventSchema>;
