import { z } from 'zod';

/** Derived educational profile payload synced from the mobile app. */
export const anonymousEducationalProfileSchema = z.object({
  knowledgeLevel: z.enum(['beginner', 'intermediate', 'advanced']),
  riskOrientation: z.enum(['conservative', 'moderate', 'dynamic']),
  investmentHorizon: z.enum(['short', 'medium', 'long']),
  investorStyle: z.enum(['defensive', 'balanced', 'enterprising']),
  financialReadiness: z.enum(['ready', 'caution', 'not-ready']),
  learningGoal: z.enum(['learn-basics', 'learn-compare', 'learn-fees-risk']),
  profileVersion: z.union([z.literal(1), z.literal(2)]),
  completedAt: z.string().datetime(),
});

export type AnonymousEducationalProfileInput = z.infer<
  typeof anonymousEducationalProfileSchema
>;
