import type { FundScoringMetrics } from './invesora-score.schema';
import {
  scoreAge,
  scoreAum,
  scoreTer,
  scoreTrackingError,
} from './rn04-score-factor.calculators';

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
    trackingError: 0.04,
    return1Y: 15,
    return3Y: 12,
    holdingsCount: 120,
    top10Weight: 28,
    maxSectorWeight: 22,
    fundAgeYears: 10,
    ...overrides,
  };
}

const peerGroup: FundScoringMetrics[] = [
  buildMetrics({
    ter: 0.35,
    trackingError: 0.2,
    aum: 500_000_000,
    fundAgeYears: 5,
  }),
  buildMetrics({
    ter: 0.5,
    trackingError: 0.35,
    aum: 100_000_000,
    fundAgeYears: 2,
  }),
];

describe('rn04-score-factor.calculators', () => {
  it('should reward lower TER within a peer group', () => {
    const efficient = scoreTer(buildMetrics({ ter: 0.09 }), peerGroup);
    const expensive = scoreTer(buildMetrics({ ter: 0.45 }), peerGroup);

    expect(efficient.points).toBeGreaterThan(expensive.points);
  });

  it('should reward lower tracking error within a peer group', () => {
    const tight = scoreTrackingError(
      buildMetrics({ trackingError: 0.03 }),
      peerGroup,
    );
    const loose = scoreTrackingError(
      buildMetrics({ trackingError: 0.4 }),
      peerGroup,
    );

    expect(tight.points).toBeGreaterThan(loose.points);
  });

  it('should reward larger AUM within a peer group', () => {
    const large = scoreAum(buildMetrics({ aum: 2_000_000_000_000 }), peerGroup);
    const small = scoreAum(buildMetrics({ aum: 50_000_000 }), peerGroup);

    expect(large.points).toBeGreaterThan(small.points);
  });

  it('should reward older funds within a peer group', () => {
    const mature = scoreAge(buildMetrics({ fundAgeYears: 15 }), peerGroup);
    const young = scoreAge(buildMetrics({ fundAgeYears: 1 }), peerGroup);

    expect(mature.points).toBeGreaterThan(young.points);
  });

  it('should apply conservative points when required inputs are missing', () => {
    expect(scoreTer(buildMetrics({ ter: null })).incomplete).toBe(true);
    expect(scoreTer(buildMetrics({ ter: null })).points).toBe(16);
    expect(
      scoreTrackingError(buildMetrics({ trackingError: null })).incomplete,
    ).toBe(true);
    expect(scoreAum(buildMetrics({ aum: null })).incomplete).toBe(true);
    expect(scoreAge(buildMetrics({ fundAgeYears: null })).incomplete).toBe(
      true,
    );
  });

  it('should produce a deterministic total score for a known peer group', () => {
    const leader = buildMetrics({
      ter: 0.05,
      trackingError: 0.02,
      aum: 5_000_000_000_000,
      fundAgeYears: 20,
    });
    const laggard = buildMetrics({
      ter: 0.8,
      trackingError: 0.5,
      aum: 10_000_000,
      fundAgeYears: 1,
    });
    const peers = [leader, laggard];

    const leaderTer = scoreTer(leader, peers);
    const laggardTer = scoreTer(laggard, peers);

    expect(leaderTer.points).toBeGreaterThan(laggardTer.points);
    expect(
      leaderTer.points + scoreTrackingError(leader, peers).points,
    ).toBeGreaterThan(
      laggardTer.points + scoreTrackingError(laggard, peers).points,
    );
  });
});
