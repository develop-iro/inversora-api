import type { FundPrice } from './fund-price.schema';
import { addDaysToIsoDate, getTodayIsoDate } from './fund-price.mapper';
import { buildFundReturnSnapshot } from './fund-return-snapshot.builder';
import type { FundReturnSnapshot } from './fund-return-snapshot.schema';
import type { FundPricesService } from '../services/fund-prices.service';

/** Lookback window used when batch-loading price history for return snapshots. */
export const FUND_RETURN_HISTORY_LOOKBACK_DAYS = 365 * 5;

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
