import {
  annualizeReturnPercent,
  buildFundScoringMetrics,
  computeTop10Weight,
  deriveReturnsFromPrices,
  estimateFundAgeYears,
} from './fund-scoring-metrics.builder';

describe('fund-scoring-metrics.builder', () => {
  it('should annualize a total return over a multi-year window', () => {
    expect(annualizeReturnPercent(30, 365 * 3)).toBeCloseTo(9.14, 1);
  });

  it('should derive 1Y and 3Y returns from price history', () => {
    const prices = [
      {
        id: '1',
        fundId: 'fund-1',
        date: '2021-01-31',
        open: 100,
        high: 101,
        low: 99,
        close: 100,
        volume: null,
        change: null,
        changePercent: null,
        vwap: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: '2',
        fundId: 'fund-1',
        date: '2024-01-31',
        open: 130,
        high: 131,
        low: 129,
        close: 130,
        volume: null,
        change: null,
        changePercent: null,
        vwap: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ];

    const returns = deriveReturnsFromPrices(prices);

    expect(returns.return1Y).not.toBeNull();
    expect(returns.return3Y).not.toBeNull();
  });

  it('should compute top 10 weight from holdings', () => {
    const holdings = Array.from({ length: 12 }, (_, index) => ({
      id: `holding-${index}`,
      fundId: 'fund-1',
      asOf: '2024-01-31',
      rank: index + 1,
      asset: `ASSET${index}`,
      name: `Asset ${index}`,
      isin: null,
      weightPercentage: 5,
      marketValue: null,
      sharesNumber: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    }));

    expect(computeTop10Weight(holdings)).toBe(50);
  });

  it('should estimate fund age from inception date', () => {
    expect(estimateFundAgeYears('2010-01-01')).toBeGreaterThanOrEqual(15);
    expect(estimateFundAgeYears(null, null)).toBeNull();
  });

  it('should build extended scoring metrics from fund inputs', () => {
    const metrics = buildFundScoringMetrics({
      metrics: {
        volatility: 12,
        drawdown: -10,
        ter: 0.09,
        aum: 500_000_000_000,
        per: null,
        dividendYield: null,
        trackingError: null,
      },
      inceptionDate: '1993-01-22',
      holdings: [],
    });

    expect(metrics.return1Y).toBeNull();
    expect(metrics.fundAgeYears).toBeGreaterThan(5);
    expect(metrics.ter).toBe(0.09);
  });
});
