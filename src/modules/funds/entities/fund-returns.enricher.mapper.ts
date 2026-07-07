import type { FundReturnSnapshot } from './fund-return-snapshot.schema';
import type { FundApi } from './fund-api.schema';
import { resolveFundReturnSnapshot } from './fund-returns.enricher';

/**
 * Attaches historical return snapshots to public fund API payloads.
 *
 * @param funds - Mapped fund API payloads with placeholder returns.
 * @param fundIds - Persisted fund ids in the same order as `funds`.
 * @param snapshots - Preloaded return snapshots keyed by fund id.
 */
export function enrichFundApiPayloadsWithReturns(
  funds: readonly FundApi[],
  fundIds: readonly string[],
  snapshots: ReadonlyMap<string, FundReturnSnapshot>,
): FundApi[] {
  return funds.map((fund, index) => ({
    ...fund,
    returns: resolveFundReturnSnapshot(snapshots, fundIds[index] ?? fund.id),
  }));
}
