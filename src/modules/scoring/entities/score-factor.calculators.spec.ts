import type { FundScoringMetrics } from './invesora-score.schema';
import {
  scoreAge,
  scoreCost,
  scoreFundSize,
  scoreRisk,
  scoreRiskAdjustedReturn,
} from './score-factor.calculators';

function buildMetrics(
  overrides: Partial<FundScoringMetrics> = {},
): FundScoringMetrics {
  return {
    volatility: 12,
    drawdown: -8,
    ter: 0.09,
    aum: 1_000_000_000_000,
    per: null,
    dividendYield: null,
    trackingError: null,
    return1Y: 15,
    return3Y: 12,
    holdingsCount: 120,
    top10Weight: 28,
    maxSectorWeight: 22,
    fundAgeYears: 10,
    ...overrides,
  };
}

describe('score-factor.calculators', () => {
  it('should reward efficient risk-adjusted returns over raw high volatility returns', () => {
    const efficient = scoreRiskAdjustedReturn(
      buildMetrics({ return1Y: 15, return3Y: 14, volatility: 10 }),
    );
    const aggressive = scoreRiskAdjustedReturn(
      buildMetrics({ return1Y: 20, return3Y: 18, volatility: 35 }),
    );

    expect(efficient.points).toBeGreaterThan(aggressive.points);
  });

  it('should give cost more weight in the breakdown than TER alone would dominate total score', () => {
    const excellentCost = scoreCost(buildMetrics({ ter: 0.09 }));
    const poorCost = scoreCost(buildMetrics({ ter: 1.5 }));

    expect(excellentCost.points).toBe(15);
    expect(poorCost.points).toBeLessThanOrEqual(5);
  });

  it('should apply conservative points when risk metrics are missing', () => {
    const result = scoreRisk(
      buildMetrics({ volatility: null, drawdown: null }),
    );

    expect(result.incomplete).toBe(true);
    expect(result.points).toBe(8);
  });

  it('should score large established funds higher on size and age', () => {
    expect(scoreFundSize(buildMetrics({ aum: 2_000_000_000 })).points).toBe(10);
    expect(scoreAge(buildMetrics({ fundAgeYears: 8 })).points).toBe(5);
  });
});
