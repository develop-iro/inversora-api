import { FundAllocationCategory as PrismaFundAllocationCategory } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';
import { parseFundPriceDate } from './fund-price.mapper';
import {
  mapCountryWeightingsToUpsertInputs,
  mapFundAllocationCategoryToPrisma,
  mapIndexFundHoldingsToUpsertInputs,
  mapSectorWeightingsToUpsertInputs,
  mapPrismaFundAllocationCategory,
  mapPrismaFundAllocationToFundAllocation,
  mapPrismaFundHoldingToFundHolding,
  mapUpsertFundAllocationInputToPrismaData,
  mapUpsertFundHoldingInputToPrismaData,
} from './fund-composition.mapper';

describe('fund-composition.mapper', () => {
  it('should map sector and country weightings to allocation upsert inputs', () => {
    expect(
      mapSectorWeightingsToUpsertInputs([
        {
          sector: 'Technology',
          weightPercentage: 31.5,
        },
      ]),
    ).toEqual([
      {
        category: 'sectorial',
        label: 'Technology',
        weight: 31.5,
        sortOrder: 0,
      },
    ]);

    expect(
      mapCountryWeightingsToUpsertInputs([
        {
          country: 'United States',
          weightPercentage: 97.5,
        },
      ]),
    ).toEqual([
      {
        category: 'countries',
        label: 'United States',
        weight: 97.5,
        sortOrder: 0,
      },
    ]);
  });

  it('should map provider holdings to ranked upsert inputs', () => {
    expect(
      mapIndexFundHoldingsToUpsertInputs([
        {
          asset: 'MSFT',
          name: 'Microsoft Corporation',
          weightPercentage: 6.8,
        },
        {
          asset: 'AAPL',
          name: 'Apple Inc.',
          isin: 'US0378331005',
          weightPercentage: 7.12,
          marketValue: 36_500_000_000,
        },
      ]),
    ).toEqual([
      {
        rank: 1,
        asset: 'AAPL',
        name: 'Apple Inc.',
        isin: 'US0378331005',
        weightPercentage: 7.12,
        marketValue: 36_500_000_000,
        sharesNumber: null,
      },
      {
        rank: 2,
        asset: 'MSFT',
        name: 'Microsoft Corporation',
        isin: null,
        weightPercentage: 6.8,
        marketValue: null,
        sharesNumber: null,
      },
    ]);
  });

  it('should map Prisma composition rows to domain entities', () => {
    const createdAt = new Date('2024-02-01T00:00:00.000Z');
    const updatedAt = new Date('2024-02-01T00:00:00.000Z');

    expect(
      mapPrismaFundHoldingToFundHolding({
        id: '550e8400-e29b-41d4-a716-446655440010',
        fundId: '550e8400-e29b-41d4-a716-446655440000',
        asOf: parseFundPriceDate('2024-01-31'),
        rank: 1,
        asset: 'AAPL',
        name: 'Apple Inc.',
        isin: 'US0378331005',
        weightPercentage: new Decimal('7.1200'),
        marketValue: new Decimal('36500000000.00'),
        sharesNumber: new Decimal('190000000.000000'),
        createdAt,
        updatedAt,
      }),
    ).toEqual({
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
      createdAt,
      updatedAt,
    });

    expect(
      mapPrismaFundAllocationToFundAllocation({
        id: '550e8400-e29b-41d4-a716-446655440011',
        fundId: '550e8400-e29b-41d4-a716-446655440000',
        asOf: parseFundPriceDate('2024-01-31'),
        category: PrismaFundAllocationCategory.SECTORIAL,
        label: 'Tecnología',
        weight: new Decimal('31.5000'),
        sortOrder: 0,
        createdAt,
        updatedAt,
      }),
    ).toEqual({
      id: '550e8400-e29b-41d4-a716-446655440011',
      fundId: '550e8400-e29b-41d4-a716-446655440000',
      asOf: '2024-01-31',
      category: 'sectorial',
      label: 'Tecnología',
      weight: 31.5,
      sortOrder: 0,
      createdAt,
      updatedAt,
    });
  });

  it('should map allocation upsert inputs to Prisma payloads', () => {
    expect(
      mapUpsertFundAllocationInputToPrismaData(
        '550e8400-e29b-41d4-a716-446655440000',
        '2024-01-31',
        {
          category: 'assetAllocation',
          label: 'Renta variable',
          weight: 88,
          sortOrder: 1,
        },
      ),
    ).toEqual({
      fundId: '550e8400-e29b-41d4-a716-446655440000',
      asOf: parseFundPriceDate('2024-01-31'),
      category: PrismaFundAllocationCategory.ASSET_ALLOCATION,
      label: 'Renta variable',
      weight: 88,
      sortOrder: 1,
    });
  });

  it('should map allocation categories in both directions', () => {
    const categories = [
      ['sectorial', PrismaFundAllocationCategory.SECTORIAL],
      ['regional', PrismaFundAllocationCategory.REGIONAL],
      ['countries', PrismaFundAllocationCategory.COUNTRIES],
      ['assetAllocation', PrismaFundAllocationCategory.ASSET_ALLOCATION],
      ['capitalization', PrismaFundAllocationCategory.CAPITALIZATION],
      ['portfolio', PrismaFundAllocationCategory.PORTFOLIO],
    ] as const;

    for (const [domain, prismaCategory] of categories) {
      expect(mapFundAllocationCategoryToPrisma(domain)).toBe(prismaCategory);
      expect(mapPrismaFundAllocationCategory(prismaCategory)).toBe(domain);
    }
  });

  it('should map holding upsert inputs to Prisma payloads', () => {
    expect(
      mapUpsertFundHoldingInputToPrismaData(
        '550e8400-e29b-41d4-a716-446655440000',
        '2024-01-31',
        {
          rank: 1,
          asset: 'AAPL',
          name: 'Apple Inc.',
          isin: null,
          weightPercentage: 7.12,
          marketValue: null,
          sharesNumber: null,
        },
      ),
    ).toEqual({
      fundId: '550e8400-e29b-41d4-a716-446655440000',
      asOf: parseFundPriceDate('2024-01-31'),
      rank: 1,
      asset: 'AAPL',
      name: 'Apple Inc.',
      isin: null,
      weightPercentage: 7.12,
      marketValue: null,
      sharesNumber: null,
    });
  });

  it('should map nullable decimal columns to null in domain entities', () => {
    const createdAt = new Date('2024-02-01T00:00:00.000Z');
    const updatedAt = new Date('2024-02-01T00:00:00.000Z');

    expect(
      mapPrismaFundHoldingToFundHolding({
        id: '550e8400-e29b-41d4-a716-446655440010',
        fundId: '550e8400-e29b-41d4-a716-446655440000',
        asOf: parseFundPriceDate('2024-01-31'),
        rank: 1,
        asset: 'AAPL',
        name: 'Apple Inc.',
        isin: null,
        weightPercentage: new Decimal('7.1200'),
        marketValue: null,
        sharesNumber: null,
        createdAt,
        updatedAt,
      }),
    ).toMatchObject({
      marketValue: null,
      sharesNumber: null,
    });
  });
});
