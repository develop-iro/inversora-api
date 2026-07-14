import { z } from 'zod';

/** Catalog risk profile filter shared by list and metrics endpoints. */
export const catalogRiskProfileSchema = z.enum([
  'all',
  'low',
  'medium',
  'high',
]);

/** Inferred type for catalog risk profile filters. */
export type CatalogRiskProfile = z.infer<typeof catalogRiskProfileSchema>;
