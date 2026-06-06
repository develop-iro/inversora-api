import type { FundHolding } from './fund-composition.schema';
import {
  fundHoldingsResponseSchema,
  type FundHoldingsResponse,
} from './fund-holdings.schema';

/**
 * Maps persisted holdings to the public holdings response shape.
 *
 * @param fundId - Persisted fund identifier.
 * @param asOf - Snapshot date when holdings exist.
 * @param holdings - Persisted holdings ordered by rank ascending.
 * @returns Validated holdings response.
 */
export function buildFundHoldingsResponse(
  fundId: string,
  asOf: string | null,
  holdings: readonly FundHolding[],
): FundHoldingsResponse {
  return fundHoldingsResponseSchema.parse({
    fundId,
    asOf,
    holdings: holdings.map((holding) => ({
      id: holding.id,
      rank: holding.rank,
      asset: holding.asset,
      name: holding.name,
      isin: holding.isin,
      weightPercentage: holding.weightPercentage,
      marketValue: holding.marketValue,
      sharesNumber: holding.sharesNumber,
    })),
  });
}
