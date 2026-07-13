import { z } from 'zod';
import { fundListQuerySchema } from './fund-list.schema';
import { investmentThemeSchema } from '../../../modules/funds/entities/investment-theme.schema';

export const catalogRiskProfileSchema = z.enum([
  'all',
  'low',
  'medium',
  'high',
]);

export const fundCatalogMetricsQuerySchema = fundListQuerySchema
  .omit({
    page: true,
    limit: true,
    sortBy: true,
    sortOrder: true,
    riskLevel: true,
    minReturn1y: true,
    minReturn3y: true,
  })
  .extend({
    riskProfile: catalogRiskProfileSchema.default('all'),
  });

export type FundCatalogMetricsQuery = z.infer<
  typeof fundCatalogMetricsQuerySchema
>;

export const fundCatalogCategoryMetricSchema = z.object({
  id: investmentThemeSchema,
  label: z.string().min(1),
  fundCount: z.number().int().nonnegative(),
  topScore: z.number().min(0).max(100).nullable(),
});

export type FundCatalogCategoryMetric = z.infer<
  typeof fundCatalogCategoryMetricSchema
>;

export const fundCatalogMetricsResponseSchema = z.object({
  total: z.number().int().nonnegative(),
  categories: z.array(fundCatalogCategoryMetricSchema),
});

export type FundCatalogMetricsResponse = z.infer<
  typeof fundCatalogMetricsResponseSchema
>;
