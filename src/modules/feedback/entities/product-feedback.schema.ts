import { z } from 'zod';

/** Whether the user found the experience clear. */
export const FEEDBACK_CLARITY_VALUES = ['yes', 'somewhat', 'no'] as const;

/** Whether the user would use Inversora again. */
export const FEEDBACK_WOULD_RETURN_VALUES = ['yes', 'maybe', 'no'] as const;

/** Anonymous product feedback payload accepted by `POST /feedback`. */
export const productFeedbackSchema = z.object({
  clarity: z.enum(FEEDBACK_CLARITY_VALUES),
  wouldReturn: z.enum(FEEDBACK_WOULD_RETURN_VALUES),
  message: z.string().trim().max(2000).optional(),
  surface: z.string().trim().min(1).max(120).default('feedback'),
  deviceId: z.string().trim().min(1).max(80).optional(),
  appEnv: z.enum(['local', 'qa', 'pro']).optional(),
  appVersion: z.string().trim().min(1).max(32).optional(),
});

export type ProductFeedback = z.infer<typeof productFeedbackSchema>;

export type FeedbackClarity = (typeof FEEDBACK_CLARITY_VALUES)[number];

export type FeedbackWouldReturn = (typeof FEEDBACK_WOULD_RETURN_VALUES)[number];
