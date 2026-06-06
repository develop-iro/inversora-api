import {
  fundPriceHistoryQuerySchema,
  fundPriceSchema,
  upsertFundPriceInputSchema,
} from './fund-price.schema';

describe('fundPriceSchema', () => {
  const validPrice = {
    id: '550e8400-e29b-41d4-a716-446655440001',
    fundId: '550e8400-e29b-41d4-a716-446655440000',
    date: '2024-01-31',
    open: 488.62,
    high: 489.08,
    low: 482.86,
    close: 482.88,
    volume: 126_011_100,
    change: -5.74,
    changePercent: -1.17,
    vwap: 485.86,
    createdAt: '2024-02-01T00:00:00.000Z',
    updatedAt: '2024-02-01T00:00:00.000Z',
  };

  it('should validate a persisted fund price row', () => {
    expect(fundPriceSchema.parse(validPrice)).toEqual({
      ...validPrice,
      createdAt: new Date(validPrice.createdAt),
      updatedAt: new Date(validPrice.updatedAt),
    });
  });

  it('should validate upsert inputs and history queries', () => {
    expect(
      upsertFundPriceInputSchema.parse({
        date: '2024-01-31',
        open: 488.62,
        high: 489.08,
        low: 482.86,
        close: 482.88,
        volume: null,
        change: null,
        changePercent: null,
        vwap: null,
      }),
    ).toEqual({
      date: '2024-01-31',
      open: 488.62,
      high: 489.08,
      low: 482.86,
      close: 482.88,
      volume: null,
      change: null,
      changePercent: null,
      vwap: null,
    });

    expect(
      fundPriceHistoryQuerySchema.parse({
        from: '2024-01-01',
        to: '2024-01-31',
      }),
    ).toEqual({
      from: '2024-01-01',
      to: '2024-01-31',
    });
  });

  it('should reject invalid dates and non-positive OHLC values', () => {
    expect(() =>
      fundPriceSchema.parse({
        ...validPrice,
        date: '31-01-2024',
      }),
    ).toThrow();

    expect(() =>
      upsertFundPriceInputSchema.parse({
        ...validPrice,
        close: 0,
      }),
    ).toThrow();
  });
});
