import { z } from 'zod';
import { featuredFundSchema } from './fund-detail.schema';

/** Query schema for `GET /featured`. */
export const featuredFundsQuerySchema = z.object({
  quarter: z.string().trim().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(20).optional(),
  benchmark: z.string().trim().min(1).optional(),
  mercado: z.string().trim().min(1).optional(),
});

/** Parsed query type for `GET /featured`. */
export type FeaturedFundsQuery = z.infer<typeof featuredFundsQuerySchema>;

/** Response schema for `GET /featured`. */
export const featuredFundsResponseSchema = z.object({
  quarter: z.string().regex(/^\d{4}-Q[1-4]$/),
  quarterTag: z.string().min(1),
  periodStart: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  periodEnd: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  data: z.array(featuredFundSchema),
});

/** Response type for `GET /featured`. */
export type FeaturedFundsResponse = z.infer<typeof featuredFundsResponseSchema>;

/** Editorial product copy for a curated featured fund entry. */
export const featuredFundEditorialSchema = z.object({
  isin: z.string().regex(/^[A-Z]{2}[A-Z0-9]{9}[0-9]$/),
  themeLabel: z.string(),
  badge: z.string(),
  benefitSummary: z.string(),
  featuredReason: z.string(),
  /** Optional market tag used by `mercado` filtering (e.g. `global`, `usa`, `europa`). */
  marketTag: z.string().optional(),
});

/** Inferred type for editorial featured fund entries. */
export type FeaturedFundEditorial = z.infer<typeof featuredFundEditorialSchema>;

/** Quarter-scoped featured fund selection config entry. */
export const featuredQuarterSelectionSchema = z.object({
  quarterKey: z.string().regex(/^\d{4}-Q[1-4]$/),
  entries: z.array(featuredFundEditorialSchema).min(1),
});

/** Inferred type for quarter-scoped featured fund selections. */
export type FeaturedQuarterSelection = z.infer<
  typeof featuredQuarterSelectionSchema
>;
