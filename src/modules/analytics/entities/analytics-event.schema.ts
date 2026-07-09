import { z } from 'zod';

/** Anonymous analytics event payload accepted by `POST /analytics/events`. */
export const analyticsEventSchema = z.object({
  event: z.enum([
    'screen_view',
    'fund_opened',
    'compare_completed',
    'learn_completed',
    'favorite_toggled',
    'calculator_run',
    'perf_mark',
  ]),
  surface: z.string().trim().min(1).max(120),
  timestamp: z.string().min(1),
  sessionId: z.string().trim().min(8).max(80),
  properties: z
    .record(z.string(), z.union([z.string(), z.number(), z.boolean()]))
    .optional(),
});

export type AnalyticsEvent = z.infer<typeof analyticsEventSchema>;
