import type { FundPrice } from './fund-price.schema';
import {
  buildReturnSnapshotsFromPrices,
  EMPTY_FUND_RETURN_SNAPSHOT,
  loadReturnSnapshotsByFundIds,
  resolveFundReturnSnapshot,
} from './fund-returns.enricher';
import type { FundPricesService } from '../services/fund-prices.service';

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

describe('fund returns enricher', () => {
  it('should return an empty map when no fund ids are provided', async () => {
    const fundPricesService = {
      getHistoriesByFundIds: jest.fn(),
    } satisfies Pick<FundPricesService, 'getHistoriesByFundIds'>;

    await expect(
      loadReturnSnapshotsByFundIds(fundPricesService as FundPricesService, []),
    ).resolves.toEqual(new Map());

    expect(fundPricesService.getHistoriesByFundIds).not.toHaveBeenCalled();
  });

  it('should build return snapshots from grouped price history', async () => {
    const fundPricesService = {
      getHistoriesByFundIds: jest
        .fn()
        .mockResolvedValue(
          new Map([
            [
              'fund-1',
              [buildPrice('2024-01-02', 100), buildPrice('2026-06-01', 120)],
            ],
          ]),
        ),
    } satisfies Pick<FundPricesService, 'getHistoriesByFundIds'>;

    const snapshots = await loadReturnSnapshotsByFundIds(
      fundPricesService as FundPricesService,
      ['fund-1'],
    );

    expect(snapshots.get('fund-1')?.threeYear).toBeCloseTo(20, 1);
  });

  it('should build snapshots for each grouped fund id', () => {
    const snapshots = buildReturnSnapshotsFromPrices(
      new Map([
        ['fund-1', [buildPrice('2026-06-01', 120)]],
        ['fund-2', []],
      ]),
    );

    expect(snapshots.get('fund-1')?.asOf).toBe('2026-06-01');
    expect(snapshots.get('fund-2')).toEqual({
      ytd: null,
      oneYear: null,
      threeYear: null,
      asOf: null,
    });
  });

  it('should fall back to the empty snapshot when a fund is missing', () => {
    expect(resolveFundReturnSnapshot(new Map(), 'missing-fund')).toBe(
      EMPTY_FUND_RETURN_SNAPSHOT,
    );
  });
});
