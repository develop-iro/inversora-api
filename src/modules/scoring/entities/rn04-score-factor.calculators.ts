import type { FundScoringMetrics } from './invesora-score.schema';
import { SCORE_MAX_POINTS } from './score-weights';
import {
  clampScore,
  percentileRank,
  pointsFromPercentile,
} from './score-utils';

const CONSERVATIVE_FACTOR_RATIO = 0.4;

/** Result of a single RN-04 scoring factor calculation. */
export type Rn04FactorResult = {
  points: number;
  incomplete: boolean;
};

function conservativePoints(maxPoints: number): number {
  return clampScore(maxPoints * CONSERVATIVE_FACTOR_RATIO, maxPoints);
}

function scoreFromAbsoluteThresholds(
  value: number,
  thresholds: readonly { min: number; points: number }[],
  maxPoints: number,
): number {
  for (const threshold of thresholds) {
    if (value >= threshold.min) {
      return clampScore(threshold.points, maxPoints);
    }
  }

  return 0;
}

function scorePercentileFactor(input: {
  value: number | null;
  peers: readonly FundScoringMetrics[];
  selectPeerValue: (peer: FundScoringMetrics) => number | null;
  higherIsBetter: boolean;
  maxPoints: number;
  absoluteThresholds: readonly { min: number; points: number }[];
  absoluteValue: (value: number) => number;
}): Rn04FactorResult {
  const { value, peers, maxPoints } = input;

  if (value === null) {
    return { points: conservativePoints(maxPoints), incomplete: true };
  }

  if (peers.length > 0) {
    const peerValues = peers
      .map(input.selectPeerValue)
      .filter((peerValue): peerValue is number => peerValue !== null);

    if (peerValues.length > 0) {
      return {
        points: pointsFromPercentile(
          percentileRank(value, peerValues, input.higherIsBetter),
          maxPoints,
          conservativePoints(maxPoints),
          true,
        ),
        incomplete: false,
      };
    }
  }

  return {
    points: scoreFromAbsoluteThresholds(
      input.absoluteValue(value),
      input.absoluteThresholds,
      maxPoints,
    ),
    incomplete: false,
  };
}

/** Calculates TER factor points (max 40). Lower TER is better. */
export function scoreTer(
  metrics: FundScoringMetrics,
  peers: readonly FundScoringMetrics[] = [],
): Rn04FactorResult {
  return scorePercentileFactor({
    value: metrics.ter,
    peers,
    selectPeerValue: (peer) => peer.ter,
    higherIsBetter: false,
    maxPoints: SCORE_MAX_POINTS.ter,
    absoluteValue: (ter) => -ter,
    absoluteThresholds: [
      { min: -0.15, points: 40 },
      { min: -0.35, points: 32 },
      { min: -0.6, points: 24 },
      { min: -1.0, points: 16 },
      { min: -Infinity, points: 8 },
    ],
  });
}

/** Calculates tracking error factor points (max 40). Lower tracking error is better. */
export function scoreTrackingError(
  metrics: FundScoringMetrics,
  peers: readonly FundScoringMetrics[] = [],
): Rn04FactorResult {
  return scorePercentileFactor({
    value: metrics.trackingError,
    peers,
    selectPeerValue: (peer) => peer.trackingError,
    higherIsBetter: false,
    maxPoints: SCORE_MAX_POINTS.tracking,
    absoluteValue: (trackingError) => -trackingError,
    absoluteThresholds: [
      { min: -0.05, points: 40 },
      { min: -0.15, points: 32 },
      { min: -0.3, points: 24 },
      { min: -0.5, points: 16 },
      { min: -Infinity, points: 8 },
    ],
  });
}

/** Calculates AUM factor points (max 10). Higher AUM is better. */
export function scoreAum(
  metrics: FundScoringMetrics,
  peers: readonly FundScoringMetrics[] = [],
): Rn04FactorResult {
  return scorePercentileFactor({
    value: metrics.aum,
    peers,
    selectPeerValue: (peer) => peer.aum,
    higherIsBetter: true,
    maxPoints: SCORE_MAX_POINTS.aum,
    absoluteValue: (aum) => aum,
    absoluteThresholds: [
      { min: 1_000_000_000, points: 10 },
      { min: 500_000_000, points: 8 },
      { min: 100_000_000, points: 6 },
      { min: 0, points: 3 },
    ],
  });
}

/** Calculates fund age factor points (max 10). Older funds score higher. */
export function scoreAge(
  metrics: FundScoringMetrics,
  peers: readonly FundScoringMetrics[] = [],
): Rn04FactorResult {
  return scorePercentileFactor({
    value: metrics.fundAgeYears,
    peers,
    selectPeerValue: (peer) => peer.fundAgeYears,
    higherIsBetter: true,
    maxPoints: SCORE_MAX_POINTS.age,
    absoluteValue: (fundAgeYears) => fundAgeYears,
    absoluteThresholds: [
      { min: 10, points: 10 },
      { min: 5, points: 8 },
      { min: 3, points: 6 },
      { min: 1, points: 4 },
      { min: 0, points: 2 },
    ],
  });
}
