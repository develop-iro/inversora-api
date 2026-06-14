import { z } from 'zod';
import { catalogVisibilitySchema } from './catalog-visibility.schema';

/** Supported external providers for persisted fund records. */
export const fundProviderSchema = z.enum(['financial-modeling-prep']);

/** Inferred type for fund providers. */
export type FundProvider = z.infer<typeof fundProviderSchema>;

/** Supported fund categories in Invesora. */
export const fundCategorySchema = z.enum(['index']);

/** Inferred type for fund categories. */
export type FundCategory = z.infer<typeof fundCategorySchema>;

/** Zod schema for persisted calculated fund metrics. */
export const fundMetricsSchema = z.object({
  volatility: z.number().nullable(),
  drawdown: z.number().nullable(),
  ter: z.number().nonnegative().nullable(),
  aum: z.number().nonnegative().nullable(),
  per: z.number().nonnegative().nullable(),
  dividendYield: z.number().nonnegative().nullable(),
  trackingError: z.number().nonnegative().nullable(),
});

/** Inferred type for persisted calculated fund metrics. */
export type FundMetrics = z.infer<typeof fundMetricsSchema>;

/** Zod schema for the main Invesora fund entity. */
export const fundSchema = z.object({
  id: z.uuid(),
  symbol: z.string().min(1),
  isin: z
    .string()
    .regex(/^[A-Z]{2}[A-Z0-9]{9}[0-9]$/, 'ISIN must follow the ISO 6166 format')
    .nullable(),
  name: z.string().min(1),
  provider: fundProviderSchema,
  category: fundCategorySchema,
  currency: z
    .string()
    .length(3)
    .regex(/^[A-Z]{3}$/, 'Currency must be a 3-letter ISO 4217 code'),
  benchmark: z.string().min(1).nullable(),
  metrics: fundMetricsSchema,
  riskLevel: z.number().int().min(1).max(7).nullable(),
  score: z.number().min(0).max(100).nullable(),
  catalogVisibility: catalogVisibilitySchema,
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});

/** Inferred type for the main Invesora fund entity. */
export type Fund = z.infer<typeof fundSchema>;

/** Route parameter schema for fund detail endpoints. */
export const fundIdParamSchema = z.object({
  id: z.uuid(),
});

/** Route parameter type for fund detail endpoints. */
export type FundIdParam = z.infer<typeof fundIdParamSchema>;

/** Input schema for creating a fund before persistence assigns timestamps and id. */
export const createFundInputSchema = fundSchema
  .omit({
    id: true,
    createdAt: true,
    updatedAt: true,
  })
  .extend({
    isin: fundSchema.shape.isin.optional(),
    benchmark: fundSchema.shape.benchmark.optional(),
    metrics: fundMetricsSchema.partial().optional(),
    riskLevel: fundSchema.shape.riskLevel.optional(),
    score: fundSchema.shape.score.optional(),
    catalogVisibility: fundSchema.shape.catalogVisibility.optional(),
  });

/** Input type for creating a fund. */
export type CreateFundInput = z.infer<typeof createFundInputSchema>;

/** Input schema for updating mutable fund fields. */
export const updateFundInputSchema = createFundInputSchema
  .omit({
    symbol: true,
    provider: true,
  })
  .partial();

/** Input type for updating a fund. */
export type UpdateFundInput = z.infer<typeof updateFundInputSchema>;

/** Input schema for upserting a fund from an external provider sync. */
export const upsertFundInputSchema = createFundInputSchema;

/** Input type for upserting a fund from an external provider sync. */
export type UpsertFundInput = z.infer<typeof upsertFundInputSchema>;
