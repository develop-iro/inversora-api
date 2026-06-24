import {
  annualizeReturnPercent,
  buildFundScoringMetrics,
  computeMaxSectorWeight,
  computeTop10Weight,
  computeTotalReturnPercent,
  deriveReturnsFromPrices,
  estimateFundAgeYears,
  findPriceAtLookback,
  resolveScoringPeerGroupKey,
} from './fund-scoring-metrics.builder';

describe('fund-scoring-metrics.builder', () => {
  it('should return zero total return when the start price is zero', () => {
    expect(computeTotalReturnPercent(0, 100)).toBe(0);
  });

  it('should annualize a total return over a multi-year window', () => {
    expect(annualizeReturnPercent(30, 365 * 3)).toBeCloseTo(9.14, 1);
    expect(annualizeReturnPercent(10, 0)).toBe(10);
    expect(annualizeReturnPercent(-120, 365)).toBe(-120);
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
    expect(computeTop10Weight([])).toBeNull();
  });

  it('should compute the maximum sector weight', () => {
    expect(
      computeMaxSectorWeight([{ weight: 10 }, { weight: 25 }, { weight: 18 }]),
    ).toBe(25);
    expect(computeMaxSectorWeight([])).toBeNull();
  });

  it('should find the closest price at a lookback window', () => {
    const prices = [
      {
        id: '1',
        fundId: 'fund-1',
        date: '2023-01-31',
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

    expect(findPriceAtLookback(prices, 365)?.date).toBe('2023-01-31');
    expect(findPriceAtLookback([], 365)).toBeNull();
  });

  it('should estimate fund age from inception date', () => {
    expect(estimateFundAgeYears('2010-01-01')).toBeGreaterThanOrEqual(15);
    expect(estimateFundAgeYears(null, null)).toBeNull();
    expect(estimateFundAgeYears('2099-01-01')).toBe(0);
  });

  it('should prefer benchmark over category for peer grouping', () => {
    expect(
      resolveScoringPeerGroupKey({
        benchmark: 'MSCI World',
        category: 'index',
        vehicle: 'etf',
      } as never),
    ).toBe('msci world');
    expect(
      resolveScoringPeerGroupKey({
        benchmark: null,
        category: 'index',
        vehicle: 'etf',
      } as never),
    ).toBe('index');
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
