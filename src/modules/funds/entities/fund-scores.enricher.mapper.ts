import type { FundApi } from './fund-api.schema';

/**
 * Fills missing persisted scores on public fund API payloads from a live score map.
 *
 * Persisted scores are kept as-is so catalog list reads stay fast after sync.
 *
 * @param funds - Mapped fund API payloads with persisted scores.
 * @param fundIds - Persisted fund ids in the same order as `funds`.
 * @param scores - Live scores keyed by fund id.
 */
export function enrichFundApiPayloadsWithScores(
  funds: readonly FundApi[],
  fundIds: readonly string[],
  scores: ReadonlyMap<string, number>,
): FundApi[] {
  return funds.map((fund, index) => {
    const fundId = fundIds[index] ?? fund.id;
    const liveScore = scores.get(fundId);

    if (liveScore === undefined || fund.score !== null) {
      return fund;
    }

    return {
      ...fund,
      score: liveScore,
    };
  });
}
