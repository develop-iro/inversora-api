import { z } from 'zod';
import { fundCategorySchema, fundProviderSchema, fundSchema } from './fund.schema';

/** Supported sort fields for fund list queries. */
export const fundListSortFieldSchema = z.enum([
  'symbol',
  'name',
  'score',
  'ter',
  'aum',
  'riskLevel',
  'currency',
  'createdAt',
  'updatedAt',
]);

/** Inferred type for fund list sort fields. */
export type FundListSortField = z.infer<typeof fundListSortFieldSchema>;

/** Supported sort directions for fund list queries. */
export const fundListSortOrderSchema = z.enum(['asc', 'desc']);

/** Inferred type for fund list sort directions. */
export type FundListSortOrder = z.infer<typeof fundListSortOrderSchema>;

/** Filter and pagination query schema for `GET /funds`. */
export const fundListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  sortBy: fundListSortFieldSchema.default('score'),
  sortOrder: fundListSortOrderSchema.default('desc'),
  q: z.string().trim().min(1).optional(),
  category: fundCategorySchema.optional(),
  currency: z
    .string()
    .length(3)
    .regex(/^[A-Za-z]{3}$/, 'Currency must be a 3-letter ISO 4217 code')
    .transform((value) => value.toUpperCase())
    .optional(),
  provider: fundProviderSchema.optional(),
  benchmark: z.string().trim().min(1).optional(),
  riskLevel: z.coerce.number().int().min(1).max(7).optional(),
  minScore: z.coerce.number().min(0).max(100).optional(),
  maxScore: z.coerce.number().min(0).max(100).optional(),
  minTer: z.coerce.number().nonnegative().optional(),
  maxTer: z.coerce.number().nonnegative().optional(),
});

/** Parsed query type for `GET /funds`. */
export type FundListQuery = z.infer<typeof fundListQuerySchema>;

/** Pagination metadata returned by fund list endpoints. */
export const fundListMetaSchema = z.object({
  page: z.number().int().positive(),
  limit: z.number().int().positive(),
  total: z.number().int().nonnegative(),
  totalPages: z.number().int().nonnegative(),
});

/** Inferred type for fund list pagination metadata. */
export type FundListMeta = z.infer<typeof fundListMetaSchema>;

/** Response schema for `GET /funds`. */
export const fundListResponseSchema = z.object({
  data: z.array(fundSchema),
  meta: fundListMetaSchema,
});

/** Response type for `GET /funds`. */
export type FundListResponse = z.infer<typeof fundListResponseSchema>;
