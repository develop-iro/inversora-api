import { z } from 'zod';

/** Catalog visibility states aligned with the mobile `CatalogVisibility` domain type. */
export const catalogVisibilitySchema = z.enum([
  'visible',
  'quarantined',
  'blocked',
]);

/** Inferred type for catalog visibility states. */
export type CatalogVisibility = z.infer<typeof catalogVisibilitySchema>;

/** States that are never exposed on public catalog endpoints. */
export const HIDDEN_CATALOG_VISIBILITY: ReadonlySet<CatalogVisibility> =
  new Set(['blocked']);

/** Fund-like input for public catalog visibility checks. */
export type CatalogVisibilityFund = {
  readonly catalogVisibility: CatalogVisibility;
  readonly isin?: string | null;
  readonly benchmark?: string | null;
  readonly name?: string;
  readonly metrics?: {
    readonly ter?: number | null;
  };
};

/**
 * Returns whether a fund may appear in public catalog endpoints.
 *
 * `blocked` funds are always hidden. `quarantined` funds with complete catalog
 * metadata are shown because the BFF computes scores at read time.
 *
 * @param fund - Fund-like object with catalog visibility and metadata.
 */
export function isCatalogVisible(fund: CatalogVisibilityFund): boolean {
  if (fund.catalogVisibility === 'blocked') {
    return false;
  }

  if (fund.catalogVisibility === 'visible') {
    return true;
  }

  const benchmark = fund.benchmark?.trim() ?? '';

  return (
    fund.isin !== null &&
    fund.isin !== undefined &&
    fund.isin.trim().length > 0 &&
    benchmark.length > 0 &&
    fund.metrics?.ter !== null &&
    fund.metrics?.ter !== undefined &&
    (fund.name?.trim().length ?? 0) > 0
  );
}
