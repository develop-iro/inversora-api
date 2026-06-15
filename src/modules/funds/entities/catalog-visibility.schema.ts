import { z } from 'zod';

/** Catalog visibility states aligned with the mobile `CatalogVisibility` domain type. */
export const catalogVisibilitySchema = z.enum([
  'visible',
  'quarantined',
  'blocked',
]);

/** Inferred type for catalog visibility states. */
export type CatalogVisibility = z.infer<typeof catalogVisibilitySchema>;

/** States excluded from public catalog listings and BFF detail responses. */
export const HIDDEN_CATALOG_VISIBILITY: ReadonlySet<CatalogVisibility> =
  new Set(['quarantined', 'blocked']);

/**
 * Returns whether a fund may appear in public catalog endpoints.
 *
 * @param fund - Fund-like object with catalog visibility.
 */
export function isCatalogVisible(fund: {
  catalogVisibility: CatalogVisibility;
}): boolean {
  return !HIDDEN_CATALOG_VISIBILITY.has(fund.catalogVisibility);
}
