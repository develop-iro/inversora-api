import { z } from 'zod';

/** Per-visibility fund counts for catalog health dashboards. */
export const catalogVisibilityCountsSchema = z.object({
  visible: z.number().int().nonnegative(),
  quarantined: z.number().int().nonnegative(),
  blocked: z.number().int().nonnegative(),
});

/** Inferred type for per-visibility fund counts. */
export type CatalogVisibilityCounts = z.infer<
  typeof catalogVisibilityCountsSchema
>;

/** Response schema for `GET /funds/catalog-summary`. */
export const catalogSummaryResponseSchema = z.object({
  total: z.number().int().nonnegative(),
  byVisibility: catalogVisibilityCountsSchema,
  /** ISO timestamp when counts were computed. */
  asOf: z.string().datetime(),
});

/** Response type for `GET /funds/catalog-summary`. */
export type CatalogSummaryResponse = z.infer<
  typeof catalogSummaryResponseSchema
>;
