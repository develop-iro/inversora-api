import type { Fund } from './fund.schema';
import type { CatalogVisibility } from './catalog-visibility.schema';

/** Reasons returned by automatic catalog visibility evaluation. */
export type CatalogVisibilityEvaluationReason =
  | 'manual-blocked'
  | 'manual-quarantined'
  | 'missing-isin'
  | 'missing-benchmark'
  | 'missing-ter'
  | 'missing-score'
  | 'missing-name'
  | 'catalog-ready';

/**
 * Returns human-readable reasons when a fund fails minimum public catalog requirements.
 *
 * @param fund - Persisted fund entity.
 */
export function collectCatalogDataQualityIssues(fund: Fund): string[] {
  const issues: string[] = [];

  if (fund.isin === null) {
    issues.push('missing-isin');
  }

  const benchmark = fund.benchmark?.trim();

  if (benchmark === undefined || benchmark.length === 0) {
    issues.push('missing-benchmark');
  }

  if (fund.metrics.ter === null) {
    issues.push('missing-ter');
  }

  if (fund.score === null) {
    issues.push('missing-score');
  }

  if (fund.name.trim().length === 0) {
    issues.push('missing-name');
  }

  return issues;
}

/**
 * Determines whether a fund satisfies minimum data for public catalog exposure.
 *
 * @param fund - Persisted fund entity.
 */
export function isCatalogDataComplete(fund: Fund): boolean {
  return collectCatalogDataQualityIssues(fund).length === 0;
}

/**
 * Resolves the catalog visibility state that automatic rules would assign.
 *
 * `blocked` funds are never promoted automatically; operators must unblock them
 * through the admin API. `quarantined` funds promote to `visible` when catalog
 * data becomes complete. Visible funds are quarantined when data is missing.
 *
 * @param fund - Persisted fund entity.
 */
export function resolveAutomaticCatalogVisibility(
  fund: Fund,
): CatalogVisibility {
  if (fund.catalogVisibility === 'blocked') {
    return 'blocked';
  }

  return isCatalogDataComplete(fund) ? 'visible' : 'quarantined';
}

/**
 * Builds an audit reason for an automatic catalog visibility transition.
 *
 * @param fund - Persisted fund entity.
 * @param nextVisibility - Target visibility state.
 */
export function buildAutomaticCatalogVisibilityReason(
  fund: Fund,
  nextVisibility: CatalogVisibility,
): string {
  if (nextVisibility === 'visible') {
    return 'Automatic: catalog data requirements satisfied';
  }

  const issues = collectCatalogDataQualityIssues(fund);

  return `Automatic: incomplete catalog data (${issues.join(', ')})`;
}
