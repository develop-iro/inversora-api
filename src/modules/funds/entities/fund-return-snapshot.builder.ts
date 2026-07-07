import type { FundPrice } from './fund-price.schema';
import {
  computeTotalReturnPercent,
  findPriceAtLookback,
} from '../../scoring/entities/fund-scoring-metrics.builder';
import {
  fundReturnSnapshotSchema,
  type FundReturnSnapshot,
} from './fund-return-snapshot.schema';

const EMPTY_SNAPSHOT: FundReturnSnapshot = {
  ytd: null,
  oneYear: null,
  threeYear: null,
  asOf: null,
};

/**
 * Builds YTD, 1Y, and 3Y total returns from ascending price history.
 *
 * @param prices - Price rows ordered by date ascending.
 * @returns Nullable return percentages and the latest price date used.
 */
export function buildFundReturnSnapshot(
  prices: readonly FundPrice[],
): FundReturnSnapshot {
  const latest = prices.at(-1);

  if (!latest) {
    return EMPTY_SNAPSHOT;
  }

  const yearStart = `${latest.date.slice(0, 4)}-01-01`;
  const ytdStart = prices.find((price) => price.date >= yearStart) ?? latest;
  const oneYear = findPriceAtLookback(prices, 365);
  const threeYear = findPriceAtLookback(prices, 365 * 3);

  return fundReturnSnapshotSchema.parse({
    ytd: computeTotalReturnPercent(ytdStart.close, latest.close),
    oneYear:
      oneYear === null
        ? null
        : computeTotalReturnPercent(oneYear.close, latest.close),
    threeYear:
      threeYear === null
        ? null
        : computeTotalReturnPercent(threeYear.close, latest.close),
    asOf: latest.date,
  });
}
