import { buildFundHoldingsResponse } from './fund-holdings.mapper';
import { fundHoldingsQuerySchema } from './fund-holdings.schema';

describe('fundHoldingsQuerySchema', () => {
  it('should accept an optional snapshot date', () => {
    expect(fundHoldingsQuerySchema.parse({})).toEqual({});
    expect(fundHoldingsQuerySchema.parse({ asOf: '2024-01-31' })).toEqual({
      asOf: '2024-01-31',
    });
  });

  it('should reject invalid snapshot dates', () => {
    expect(() =>
      fundHoldingsQuerySchema.parse({ asOf: '31-01-2024' }),
    ).toThrow();
  });
});

describe('buildFundHoldingsResponse', () => {
  it('should build a validated holdings response payload', () => {
    expect(
      buildFundHoldingsResponse(
        '550e8400-e29b-41d4-a716-446655440000',
        '2024-01-31',
        [
          {
            id: '550e8400-e29b-41d4-a716-446655440010',
            fundId: '550e8400-e29b-41d4-a716-446655440000',
            asOf: '2024-01-31',
            rank: 1,
            asset: 'AAPL',
            name: 'Apple Inc.',
            isin: 'US0378331005',
            weightPercentage: 7.12,
            marketValue: 36_500_000_000,
            sharesNumber: 190_000_000,
            createdAt: new Date('2024-02-01T00:00:00.000Z'),
            updatedAt: new Date('2024-02-01T00:00:00.000Z'),
          },
        ],
      ),
    ).toEqual({
      fundId: '550e8400-e29b-41d4-a716-446655440000',
      asOf: '2024-01-31',
      holdings: [
        {
          id: '550e8400-e29b-41d4-a716-446655440010',
          rank: 1,
          asset: 'AAPL',
          name: 'Apple Inc.',
          isin: 'US0378331005',
          weightPercentage: 7.12,
          marketValue: 36_500_000_000,
          sharesNumber: 190_000_000,
        },
      ],
    });
  });
});
