import type { FundScoringMetrics } from './invesora-score.schema';
import {
  scoreAge,
  scoreCost,
  scoreDiversification,
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

const peerMetrics: FundScoringMetrics[] = [
  buildMetrics({
    volatility: 18,
    drawdown: -15,
    ter: 0.35,
    aum: 500_000_000,
    return1Y: 10,
    return3Y: 8,
    holdingsCount: 80,
    top10Weight: 45,
  }),
  buildMetrics({
    volatility: 20,
    drawdown: -20,
    ter: 0.5,
    aum: 100_000_000,
    return1Y: 8,
    return3Y: 6,
    holdingsCount: 60,
    top10Weight: 55,
  }),
];

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

  it('should use peer comparison when peers are available', () => {
    const metrics = buildMetrics();

    expect(
      scoreRiskAdjustedReturn(metrics, peerMetrics).incomplete,
    ).toBe(false);
    expect(scoreRisk(metrics, peerMetrics).incomplete).toBe(false);
    expect(scoreCost(metrics, peerMetrics).incomplete).toBe(false);
    expect(scoreFundSize(metrics, peerMetrics).incomplete).toBe(false);
    expect(scoreDiversification(metrics, peerMetrics).incomplete).toBe(false);
  });

  it('should penalize negative returns without peer data', () => {
    const result = scoreRiskAdjustedReturn(
      buildMetrics({ return1Y: -5, return3Y: -3, volatility: 10 }),
    );

    expect(result.incomplete).toBe(false);
    expect(result.points).toBeLessThanOrEqual(8);
  });

  it('should mark incomplete factors when required inputs are missing', () => {
    expect(scoreRiskAdjustedReturn(buildMetrics({ return1Y: null, return3Y: null, volatility: null })).incomplete).toBe(true);
    expect(scoreCost(buildMetrics({ ter: null })).incomplete).toBe(true);
    expect(scoreFundSize(buildMetrics({ aum: null })).incomplete).toBe(true);
    expect(scoreAge(buildMetrics({ fundAgeYears: null })).incomplete).toBe(true);
    expect(
      scoreDiversification(
        buildMetrics({
          holdingsCount: null,
          top10Weight: null,
          maxSectorWeight: null,
        }),
      ).incomplete,
    ).toBe(true);
  });

  it('should score diversification from absolute thresholds without peers', () => {
    const result = scoreDiversification(
      buildMetrics({
        holdingsCount: 120,
        top10Weight: 25,
        maxSectorWeight: 20,
      }),
    );

    expect(result.incomplete).toBe(false);
    expect(result.points).toBeGreaterThan(0);
  });

  it('should mark individual diversification inputs as incomplete when missing', () => {
    expect(
      scoreDiversification(
        buildMetrics({
          holdingsCount: null,
          top10Weight: 25,
          maxSectorWeight: 20,
        }),
      ).incomplete,
    ).toBe(true);
    expect(
      scoreDiversification(
        buildMetrics({
          holdingsCount: 120,
          top10Weight: null,
          maxSectorWeight: 20,
        }),
      ).incomplete,
    ).toBe(true);
    expect(
      scoreDiversification(
        buildMetrics({
          holdingsCount: 120,
          top10Weight: 25,
          maxSectorWeight: null,
        }),
      ).incomplete,
    ).toBe(true);
  });

  it('should score risk using absolute thresholds when only one metric is available', () => {
    const volatilityOnly = scoreRisk(
      buildMetrics({ volatility: 10, drawdown: null }),
    );
    const drawdownOnly = scoreRisk(
      buildMetrics({ volatility: null, drawdown: -12 }),
    );

    expect(volatilityOnly.incomplete).toBe(true);
    expect(drawdownOnly.incomplete).toBe(true);
    expect(volatilityOnly.points).toBeGreaterThan(0);
    expect(drawdownOnly.points).toBeGreaterThan(0);
  });

  it('should score risk with absolute thresholds when peers are empty', () => {
    const result = scoreRisk(buildMetrics(), []);

    expect(result.incomplete).toBe(false);
    expect(result.points).toBeGreaterThan(0);
  });
});
