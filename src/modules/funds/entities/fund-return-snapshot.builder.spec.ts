import type { FundPrice } from './fund-price.schema';
import { buildFundReturnSnapshot } from './fund-return-snapshot.builder';

function buildPrice(date: string, close: number): FundPrice {
  return {
    id: `price-${date}`,
    fundId: 'fund-1',
    date,
    open: close,
    high: close,
    low: close,
    close,
    volume: null,
    change: null,
    changePercent: null,
    vwap: null,
    createdAt: new Date(`${date}T00:00:00.000Z`),
    updatedAt: new Date(`${date}T00:00:00.000Z`),
  };
}

describe('buildFundReturnSnapshot', () => {
  it('should return null returns when price history is empty', () => {
    expect(buildFundReturnSnapshot([])).toEqual({
      ytd: null,
      oneYear: null,
      threeYear: null,
      asOf: null,
    });
  });

  it('should compute YTD and 1Y returns from ascending prices', () => {
    const prices: FundPrice[] = [
      buildPrice('2024-01-02', 100),
      buildPrice('2025-06-01', 110),
      buildPrice('2026-01-15', 110),
      buildPrice('2026-06-01', 120),
    ];

    const snapshot = buildFundReturnSnapshot(prices);

    expect(snapshot.asOf).toBe('2026-06-01');
    expect(snapshot.ytd).toBeCloseTo(9.09, 1);
    expect(snapshot.oneYear).toBeCloseTo(9.09, 1);
    expect(snapshot.threeYear).toBeCloseTo(20, 1);
  });
});
