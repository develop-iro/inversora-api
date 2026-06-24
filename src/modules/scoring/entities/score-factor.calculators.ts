import type { FundScoringMetrics } from './invesora-score.schema';
import { LEGACY_SCORE_MAX_POINTS as SCORE_MAX_POINTS } from './score-weights-legacy';
import {
  blendAnnualizedReturn,
  clampScore,
  computeRiskAdjustedReturnRatio,
  percentileRank,
  pointsFromPercentile,
} from './score-utils';

const CONSERVATIVE_FACTOR_RATIO = 0.4;

type FactorResult = {
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

/** Calculates risk-adjusted return factor points (max 40). */
export function scoreRiskAdjustedReturn(
  metrics: FundScoringMetrics,
  peers: readonly FundScoringMetrics[] = [],
): FactorResult {
  const maxPoints = SCORE_MAX_POINTS.riskAdjustedReturn;
  const annualizedReturn = blendAnnualizedReturn(
    metrics.return1Y,
    metrics.return3Y,
  );
  const ratio = computeRiskAdjustedReturnRatio(
    annualizedReturn,
    metrics.volatility,
  );

  if (ratio === null) {
    return { points: conservativePoints(maxPoints), incomplete: true };
  }

  if (peers.length > 0) {
    const peerRatios = peers
      .map((peer) =>
        computeRiskAdjustedReturnRatio(
          blendAnnualizedReturn(peer.return1Y, peer.return3Y),
          peer.volatility,
        ),
      )
      .filter((peerRatio): peerRatio is number => peerRatio !== null);

    if (peerRatios.length > 0) {
      return {
        points: pointsFromPercentile(
          percentileRank(ratio, peerRatios, true),
          maxPoints,
          conservativePoints(maxPoints),
          true,
        ),
        incomplete: false,
      };
    }
  }

  if (annualizedReturn !== null && annualizedReturn < 0) {
    return {
      points: clampScore(Math.min(8, ratio * 6), maxPoints),
      incomplete: false,
    };
  }

  return {
    points: scoreFromAbsoluteThresholds(
      ratio,
      [
        { min: 1.5, points: 40 },
        { min: 1.0, points: 34 },
        { min: 0.7, points: 28 },
        { min: 0.4, points: 20 },
        { min: 0, points: 12 },
      ],
      maxPoints,
    ),
    incomplete: false,
  };
}

/** Calculates risk stability factor points (max 20). */
export function scoreRisk(
  metrics: FundScoringMetrics,
  peers: readonly FundScoringMetrics[] = [],
): FactorResult {
  const maxPoints = SCORE_MAX_POINTS.risk;
  const volatility = metrics.volatility;
  const drawdown = metrics.drawdown;

  if (volatility === null && drawdown === null) {
    return { points: conservativePoints(maxPoints), incomplete: true };
  }

  const volatilityWeight = 0.6;
  const drawdownWeight = 0.4;
  let volatilityPoints = conservativePoints(maxPoints * volatilityWeight);
  let drawdownPoints = conservativePoints(maxPoints * drawdownWeight);
  let incomplete = false;

  if (volatility !== null) {
    if (peers.length > 0) {
      const peerVolatilities = peers
        .map((peer) => peer.volatility)
        .filter(
          (peerVolatility): peerVolatility is number => peerVolatility !== null,
        );

      if (peerVolatilities.length > 0) {
        volatilityPoints = pointsFromPercentile(
          percentileRank(volatility, peerVolatilities, false),
          maxPoints * volatilityWeight,
          conservativePoints(maxPoints * volatilityWeight),
          true,
        );
      }
    } else {
      volatilityPoints = scoreFromAbsoluteThresholds(
        -volatility,
        [
          { min: -8, points: 12 },
          { min: -12, points: 10 },
          { min: -18, points: 8 },
          { min: -25, points: 5 },
          { min: -Infinity, points: 2 },
        ],
        maxPoints * volatilityWeight,
      );
    }
  } else {
    incomplete = true;
  }

  if (drawdown !== null) {
    if (peers.length > 0) {
      const peerDrawdowns = peers
        .map((peer) => peer.drawdown)
        .filter(
          (peerDrawdown): peerDrawdown is number => peerDrawdown !== null,
        );

      if (peerDrawdowns.length > 0) {
        drawdownPoints = pointsFromPercentile(
          percentileRank(drawdown, peerDrawdowns, true),
          maxPoints * drawdownWeight,
          conservativePoints(maxPoints * drawdownWeight),
          true,
        );
      }
    } else {
      drawdownPoints = scoreFromAbsoluteThresholds(
        drawdown,
        [
          { min: -5, points: 8 },
          { min: -10, points: 6 },
          { min: -20, points: 4 },
          { min: -35, points: 2 },
          { min: -Infinity, points: 0 },
        ],
        maxPoints * drawdownWeight,
      );
    }
  } else {
    incomplete = true;
  }

  return {
    points: clampScore(volatilityPoints + drawdownPoints, maxPoints),
    incomplete,
  };
}

/** Calculates annual cost factor points (max 15). TER is expressed as a percentage. */
export function scoreCost(
  metrics: FundScoringMetrics,
  peers: readonly FundScoringMetrics[] = [],
): FactorResult {
  const maxPoints = SCORE_MAX_POINTS.cost;
  const ter = metrics.ter;

  if (ter === null) {
    return { points: conservativePoints(maxPoints), incomplete: true };
  }

  if (peers.length > 0) {
    const peerTers = peers
      .map((peer) => peer.ter)
      .filter((peerTer): peerTer is number => peerTer !== null);

    if (peerTers.length > 0) {
      return {
        points: pointsFromPercentile(
          percentileRank(ter, peerTers, false),
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
      -ter,
      [
        { min: -0.15, points: 15 },
        { min: -0.35, points: 12 },
        { min: -0.6, points: 9 },
        { min: -1.0, points: 5 },
        { min: -Infinity, points: 2 },
      ],
      maxPoints,
    ),
    incomplete: false,
  };
}

/** Calculates diversification factor points (max 10). */
export function scoreDiversification(
  metrics: FundScoringMetrics,
  peers: readonly FundScoringMetrics[] = [],
): FactorResult {
  const maxPoints = SCORE_MAX_POINTS.diversification;
  const { holdingsCount, top10Weight, maxSectorWeight } = metrics;

  if (
    holdingsCount === null &&
    top10Weight === null &&
    maxSectorWeight === null
  ) {
    return { points: conservativePoints(maxPoints), incomplete: true };
  }

  const holdingsWeight = 0.4;
  const top10WeightShare = 0.4;
  const sectorWeightShare = 0.2;
  let holdingsPoints = conservativePoints(maxPoints * holdingsWeight);
  let top10Points = conservativePoints(maxPoints * top10WeightShare);
  let sectorPoints = conservativePoints(maxPoints * sectorWeightShare);
  let incomplete = false;

  if (holdingsCount !== null) {
    holdingsPoints = scoreFromAbsoluteThresholds(
      holdingsCount,
      [
        { min: 100, points: 4 },
        { min: 50, points: 3 },
        { min: 25, points: 2 },
        { min: 10, points: 1 },
        { min: 0, points: 0 },
      ],
      maxPoints * holdingsWeight,
    );
  } else {
    incomplete = true;
  }

  if (top10Weight !== null) {
    top10Points = scoreFromAbsoluteThresholds(
      -top10Weight,
      [
        { min: -25, points: 4 },
        { min: -40, points: 3 },
        { min: -55, points: 2 },
        { min: -70, points: 1 },
        { min: -Infinity, points: 0 },
      ],
      maxPoints * top10WeightShare,
    );
  } else {
    incomplete = true;
  }

  if (maxSectorWeight !== null) {
    sectorPoints = scoreFromAbsoluteThresholds(
      -maxSectorWeight,
      [
        { min: -25, points: 2 },
        { min: -35, points: 1.5 },
        { min: -50, points: 1 },
        { min: -Infinity, points: 0 },
      ],
      maxPoints * sectorWeightShare,
    );
  } else {
    incomplete = true;
  }

  if (peers.length > 0) {
    const peerHoldings = peers
      .map((peer) => peer.holdingsCount)
      .filter((count): count is number => count !== null);

    if (peerHoldings.length > 0 && holdingsCount !== null) {
      holdingsPoints = pointsFromPercentile(
        percentileRank(holdingsCount, peerHoldings, true),
        maxPoints * holdingsWeight,
        holdingsPoints,
        true,
      );
    }

    const peerTop10 = peers
      .map((peer) => peer.top10Weight)
      .filter((weight): weight is number => weight !== null);

    if (peerTop10.length > 0 && top10Weight !== null) {
      top10Points = pointsFromPercentile(
        percentileRank(top10Weight, peerTop10, false),
        maxPoints * top10WeightShare,
        top10Points,
        true,
      );
    }
  }

  return {
    points: clampScore(holdingsPoints + top10Points + sectorPoints, maxPoints),
    incomplete,
  };
}

/** Calculates fund size factor points (max 10). AUM is expressed in fund currency units. */
export function scoreFundSize(
  metrics: FundScoringMetrics,
  peers: readonly FundScoringMetrics[] = [],
): FactorResult {
  const maxPoints = SCORE_MAX_POINTS.fundSize;
  const aum = metrics.aum;

  if (aum === null) {
    return { points: conservativePoints(maxPoints), incomplete: true };
  }

  if (peers.length > 0) {
    const peerAums = peers
      .map((peer) => peer.aum)
      .filter((peerAum): peerAum is number => peerAum !== null);

    if (peerAums.length > 0) {
      return {
        points: pointsFromPercentile(
          percentileRank(aum, peerAums, true),
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
      aum,
      [
        { min: 1_000_000_000, points: 10 },
        { min: 500_000_000, points: 8 },
        { min: 100_000_000, points: 6 },
        { min: 0, points: 3 },
      ],
      maxPoints,
    ),
    incomplete: false,
  };
}

/** Calculates fund age factor points (max 5). */
export function scoreAge(metrics: FundScoringMetrics): FactorResult {
  const maxPoints = SCORE_MAX_POINTS.age;
  const fundAgeYears = metrics.fundAgeYears;

  if (fundAgeYears === null) {
    return { points: conservativePoints(maxPoints), incomplete: true };
  }

  return {
    points: scoreFromAbsoluteThresholds(
      fundAgeYears,
      [
        { min: 5, points: 5 },
        { min: 3, points: 4 },
        { min: 1, points: 2.5 },
        { min: 0, points: 1 },
      ],
      maxPoints,
    ),
    incomplete: false,
  };
}
