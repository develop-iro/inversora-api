/** Clamps and rounds a score to the 0–100 integer range. */
export function clampScore(value: number, max = 100): number {
  return Math.max(0, Math.min(max, Math.round(value)));
}

/** Clamps a fractional value to the 0–1 range. */
export function clampUnit(value: number): number {
  return Math.max(0, Math.min(1, value));
}

/**
 * Returns the percentile rank of `value` within `peers` on a 0–1 scale.
 *
 * @param value - Observed metric for the target fund.
 * @param peers - Peer metric values in the same category or benchmark.
 * @param higherIsBetter - When `false`, lower values receive a higher rank.
 */
export function percentileRank(
  value: number,
  peers: readonly number[],
  higherIsBetter: boolean,
): number {
  if (peers.length === 0) {
    return 0.5;
  }

  const comparablePeers = higherIsBetter
    ? peers.filter((peer) => peer <= value).length
    : peers.filter((peer) => peer >= value).length;

  return clampUnit(comparablePeers / peers.length);
}

/**
 * Maps a 0–1 percentile to factor points.
 *
 * @param percentile - Normalized rank within the peer group.
 * @param maxPoints - Maximum points for the factor.
 * @param conservativeFallback - Points used when the factor is incomplete.
 */
export function pointsFromPercentile(
  percentile: number,
  maxPoints: number,
  conservativeFallback: number,
  isComplete: boolean,
): number {
  if (!isComplete) {
    return conservativeFallback;
  }

  return clampScore(percentile * maxPoints, maxPoints);
}

/**
 * Blends short- and long-term annualized returns when both are available.
 *
 * @param return1Y - 1-year return percentage.
 * @param return3Y - 3-year return percentage.
 */
export function blendAnnualizedReturn(
  return1Y: number | null,
  return3Y: number | null,
): number | null {
  if (return1Y !== null && return3Y !== null) {
    return return1Y * 0.6 + return3Y * 0.4;
  }

  return return1Y ?? return3Y;
}

/**
 * Computes the risk-adjusted return ratio used by the MVP algorithm.
 *
 * Formula: `annualizedReturn / volatility`.
 *
 * Both inputs are expected as percentages (e.g. 15% return, 12% volatility).
 */
export function computeRiskAdjustedReturnRatio(
  annualizedReturn: number | null,
  volatility: number | null,
): number | null {
  if (annualizedReturn === null || volatility === null || volatility <= 0) {
    return null;
  }

  return annualizedReturn / volatility;
}
