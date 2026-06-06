import {
  fundCompositionSchema,
  replaceFundCompositionInputSchema,
} from './fund-composition.schema';

describe('fundCompositionSchema', () => {
  const validSnapshot = {
    asOf: '2024-01-31',
    holdings: [
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
        createdAt: '2024-02-01T00:00:00.000Z',
        updatedAt: '2024-02-01T00:00:00.000Z',
      },
    ],
    allocations: [
      {
        id: '550e8400-e29b-41d4-a716-446655440011',
        fundId: '550e8400-e29b-41d4-a716-446655440000',
        asOf: '2024-01-31',
        category: 'sectorial' as const,
        label: 'Tecnología',
        weight: 31.5,
        sortOrder: 0,
        createdAt: '2024-02-01T00:00:00.000Z',
        updatedAt: '2024-02-01T00:00:00.000Z',
      },
    ],
  };

  it('should validate a persisted composition snapshot', () => {
    expect(fundCompositionSchema.parse(validSnapshot)).toEqual({
      ...validSnapshot,
      holdings: [
        {
          ...validSnapshot.holdings[0],
          createdAt: new Date(validSnapshot.holdings[0].createdAt),
          updatedAt: new Date(validSnapshot.holdings[0].updatedAt),
        },
      ],
      allocations: [
        {
          ...validSnapshot.allocations[0],
          createdAt: new Date(validSnapshot.allocations[0].createdAt),
          updatedAt: new Date(validSnapshot.allocations[0].updatedAt),
        },
      ],
    });
  });

  it('should validate replace snapshot inputs', () => {
    expect(
      replaceFundCompositionInputSchema.parse({
        asOf: '2024-01-31',
        holdings: [
          {
            rank: 1,
            asset: 'MSFT',
            name: 'Microsoft Corporation',
            isin: null,
            weightPercentage: 6.8,
            marketValue: null,
            sharesNumber: null,
          },
        ],
        allocations: [
          {
            category: 'regional',
            label: 'Estados Unidos',
            weight: 98.5,
            sortOrder: 0,
          },
        ],
      }),
    ).toEqual({
      asOf: '2024-01-31',
      holdings: [
        {
          rank: 1,
          asset: 'MSFT',
          name: 'Microsoft Corporation',
          isin: null,
          weightPercentage: 6.8,
          marketValue: null,
          sharesNumber: null,
        },
      ],
      allocations: [
        {
          category: 'regional',
          label: 'Estados Unidos',
          weight: 98.5,
          sortOrder: 0,
        },
      ],
    });
  });
});
