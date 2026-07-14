import type { FundPrice } from './fund-price.schema';
import { addDaysToIsoDate, getTodayIsoDate } from './fund-price.mapper';
import { buildFundReturnSnapshot } from './fund-return-snapshot.builder';
import type { FundReturnSnapshot } from './fund-return-snapshot.schema';
import type { FundPricesService } from '../services/fund-prices.service';

/** Lookback window used when batch-loading price history for return snapshots. */
export const FUND_RETURN_HISTORY_LOOKBACK_DAYS = 365 * 5;

/** Lookback window for catalog list cards (1Y historical return only). */
export const FUND_CATALOG_LIST_RETURN_LOOKBACK_DAYS = 400;

/** Empty return snapshot used before price enrichment. */
export const EMPTY_FUND_RETURN_SNAPSHOT: FundReturnSnapshot = {
  ytd: null,
  oneYear: null,
  threeYear: null,
  asOf: null,
};

/**
 * Loads return snapshots for multiple funds in one price-history query.
 *
 * @param fundPricesService - Fund prices application service.
 * @param fundIds - Persisted fund identifiers.
 */
export async function loadReturnSnapshotsByFundIds(
  fundPricesService: FundPricesService,
  fundIds: readonly string[],
): Promise<Map<string, FundReturnSnapshot>> {
  if (fundIds.length === 0) {
    return new Map();
  }

  const from = addDaysToIsoDate(
    getTodayIsoDate(),
    -FUND_RETURN_HISTORY_LOOKBACK_DAYS,
  );
  const pricesByFundId = await fundPricesService.getHistoriesByFundIds(
    fundIds,
    { from },
  );

  return buildReturnSnapshotsFromPrices(pricesByFundId);
}

/**
 * Loads lightweight 1Y return snapshots for catalog list cards.
 *
 * Avoids loading multi-year price history on paginated catalog reads.
 *
 * @param fundPricesService - Fund prices application service.
 * @param fundIds - Persisted fund identifiers.
 */
export async function loadCatalogListReturnSnapshotsByFundIds(
  fundPricesService: FundPricesService,
  fundIds: readonly string[],
): Promise<Map<string, FundReturnSnapshot>> {
  if (fundIds.length === 0) {
    return new Map();
  }

  const from = addDaysToIsoDate(
    getTodayIsoDate(),
    -FUND_CATALOG_LIST_RETURN_LOOKBACK_DAYS,
  );
  const pricesByFundId = await fundPricesService.getHistoriesByFundIds(
    fundIds,
    { from },
  );

  return buildCatalogListReturnSnapshotsFromPrices(pricesByFundId);
}

/**
 * Builds return snapshots from grouped ascending price rows.
 *
 * @param pricesByFundId - Price rows grouped by fund id.
 */
export function buildReturnSnapshotsFromPrices(
  pricesByFundId: ReadonlyMap<string, readonly FundPrice[]>,
): Map<string, FundReturnSnapshot> {
  const snapshots = new Map<string, FundReturnSnapshot>();

  for (const [fundId, prices] of pricesByFundId.entries()) {
    snapshots.set(fundId, buildFundReturnSnapshot(prices));
  }

  return snapshots;
}

/**
 * Builds catalog-list return snapshots with only 1Y and `asOf` populated.
 *
 * @param pricesByFundId - Price rows grouped by fund id.
 */
export function buildCatalogListReturnSnapshotsFromPrices(
  pricesByFundId: ReadonlyMap<string, readonly FundPrice[]>,
): Map<string, FundReturnSnapshot> {
  const snapshots = new Map<string, FundReturnSnapshot>();

  for (const [fundId, prices] of pricesByFundId.entries()) {
    const snapshot = buildFundReturnSnapshot(prices);

    snapshots.set(fundId, {
      ytd: null,
      oneYear: snapshot.oneYear,
      threeYear: null,
      asOf: snapshot.asOf,
    });
  }

  return snapshots;
}

/**
 * Merges a primary return snapshot with optional price-derived fallbacks.
 *
 * Materialized columns win when present; null fields are filled from prices.
 *
 * @param primary - Materialized or pre-resolved snapshot.
 * @param fallback - Optional snapshot built from stored price history.
 */
export function mergeReturnSnapshots(
  primary: FundReturnSnapshot,
  fallback: FundReturnSnapshot | undefined,
): FundReturnSnapshot {
  if (fallback === undefined) {
    return primary;
  }

  return {
    ytd: primary.ytd ?? fallback.ytd,
    oneYear: primary.oneYear ?? fallback.oneYear,
    threeYear: primary.threeYear ?? fallback.threeYear,
    asOf: primary.asOf ?? fallback.asOf,
  };
}

/**
 * Returns fund ids whose materialized one-year return is still null.
 *
 * @param funds - Persisted funds for the current read.
 */
export function collectFundIdsNeedingReturnFallback(
  funds: readonly {
    readonly id: string;
    readonly materialized: { readonly return1y: number | null };
  }[],
): string[] {
  return funds
    .filter((fund) => fund.materialized.return1y === null)
    .map((fund) => fund.id);
}

/**
 * Loads price-derived return fallbacks for funds missing materialized 1Y data.
 *
 * @param fundPricesService - Fund prices application service.
 * @param fundIds - Persisted fund identifiers.
 */
export async function loadReturnSnapshotFallbacksByFundIds(
  fundPricesService: FundPricesService,
  fundIds: readonly string[],
): Promise<Map<string, FundReturnSnapshot>> {
  if (fundIds.length === 0) {
    return new Map();
  }

  return loadCatalogListReturnSnapshotsByFundIds(fundPricesService, fundIds);
}

/**
 * Resolves a fund return snapshot from a preloaded map.
 *
 * @param snapshots - Return snapshots keyed by fund id.
 * @param fundId - Persisted fund identifier.
 */
export function resolveFundReturnSnapshot(
  snapshots: ReadonlyMap<string, FundReturnSnapshot>,
  fundId: string,
): FundReturnSnapshot {
  return snapshots.get(fundId) ?? EMPTY_FUND_RETURN_SNAPSHOT;
}
