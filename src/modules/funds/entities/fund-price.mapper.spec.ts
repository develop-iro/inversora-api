import { Decimal } from '@prisma/client/runtime/library';
import {
  formatFundPriceDate,
  mapIndexFundHistoricalPriceToUpsertInput,
  mapPrismaFundPriceToFundPrice,
  mapUpsertFundPriceInputToPrismaData,
  parseFundPriceDate,
} from './fund-price.mapper';

describe('fund-price.mapper', () => {
  const upsertInput = {
    date: '2024-01-31',
    open: 488.62,
    high: 489.08,
    low: 482.86,
    close: 482.88,
    volume: 126_011_100,
    change: -5.74,
    changePercent: -1.17,
    vwap: 485.86,
  };

  it('should parse and format ISO date-only values in UTC', () => {
    const parsed = parseFundPriceDate('2024-01-31');

    expect(parsed.toISOString()).toBe('2024-01-31T00:00:00.000Z');
    expect(formatFundPriceDate(parsed)).toBe('2024-01-31');
  });

  it('should map provider prices and Prisma rows to domain entities', () => {
    expect(
      mapIndexFundHistoricalPriceToUpsertInput({
        date: '2024-01-31',
        open: 488.62,
        high: 489.08,
        low: 482.86,
        close: 482.88,
        volume: 126_011_100,
        change: -5.74,
        changePercent: -1.17,
        vwap: 485.86,
      }),
    ).toEqual(upsertInput);

    const createdAt = new Date('2024-02-01T00:00:00.000Z');
    const updatedAt = new Date('2024-02-01T00:00:00.000Z');

    expect(
      mapPrismaFundPriceToFundPrice({
        id: '550e8400-e29b-41d4-a716-446655440001',
        fundId: '550e8400-e29b-41d4-a716-446655440000',
        date: parseFundPriceDate('2024-01-31'),
        open: new Decimal('488.620000'),
        high: new Decimal('489.080000'),
        low: new Decimal('482.860000'),
        close: new Decimal('482.880000'),
        volume: BigInt(126_011_100),
        change: new Decimal('-5.740000'),
        changePercent: new Decimal('-1.170000'),
        vwap: new Decimal('485.860000'),
        createdAt,
        updatedAt,
      }),
    ).toEqual({
      id: '550e8400-e29b-41d4-a716-446655440001',
      fundId: '550e8400-e29b-41d4-a716-446655440000',
      ...upsertInput,
      createdAt,
      updatedAt,
    });
  });

  it('should map upsert inputs to Prisma create payloads', () => {
    expect(
      mapUpsertFundPriceInputToPrismaData(
        '550e8400-e29b-41d4-a716-446655440000',
        upsertInput,
      ),
    ).toEqual({
      fundId: '550e8400-e29b-41d4-a716-446655440000',
      date: parseFundPriceDate('2024-01-31'),
      open: 488.62,
      high: 489.08,
      low: 482.86,
      close: 482.88,
      volume: BigInt(126_011_100),
      change: -5.74,
      changePercent: -1.17,
      vwap: 485.86,
    });
  });
});
