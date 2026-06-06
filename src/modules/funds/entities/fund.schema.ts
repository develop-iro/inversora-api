import { z } from 'zod';

/** Supported external providers for persisted fund records. */
export const fundProviderSchema = z.enum(['financial-modeling-prep']);

/** Inferred type for fund providers. */
export type FundProvider = z.infer<typeof fundProviderSchema>;

/** Supported fund categories in Invesora. */
export const fundCategorySchema = z.enum(['index']);

/** Inferred type for fund categories. */
export type FundCategory = z.infer<typeof fundCategorySchema>;

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
  expenseRatio: z.number().nonnegative().nullable(),
  riskLevel: z.number().int().min(1).max(7).nullable(),
  score: z.number().min(0).max(100).nullable(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});

/** Inferred type for the main Invesora fund entity. */
export type Fund = z.infer<typeof fundSchema>;

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
    expenseRatio: fundSchema.shape.expenseRatio.optional(),
    riskLevel: fundSchema.shape.riskLevel.optional(),
    score: fundSchema.shape.score.optional(),
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
