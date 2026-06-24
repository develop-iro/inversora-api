import {
  CatalogVisibility,
  FundCategory,
  FundProvider,
  FundVehicleType,
} from '@prisma/client';
import {
  buildFundListMeta,
  buildFundListOrderByInput,
  buildFundListWhereInput,
} from './fund-list.mapper';

describe('fund-list.mapper', () => {
  it('should default to visible-only catalog filtering', () => {
    expect(buildFundListWhereInput({})).toEqual({
      AND: [{ catalogVisibility: { in: [CatalogVisibility.VISIBLE] } }],
    });
  });

  it('should honor explicit admin visibility filters', () => {
    expect(
      buildFundListWhereInput(
        {},
        { catalogVisibility: ['visible', 'quarantined', 'blocked'] },
      ),
    ).toEqual({
      AND: [
        {
          catalogVisibility: {
            in: [
              CatalogVisibility.VISIBLE,
              CatalogVisibility.QUARANTINED,
              CatalogVisibility.BLOCKED,
            ],
          },
        },
      ],
    });
  });

  it('should build filters for all supported query parameters', () => {
    expect(
      buildFundListWhereInput({
        q: 'spy',
        category: 'index',
        vehicle: 'etf',
        currency: 'USD',
        provider: 'financial-modeling-prep',
        benchmark: 'S&P 500',
        riskLevel: 4,
        minScore: 70,
        maxScore: 90,
        minTer: 0.05,
        maxTer: 0.5,
      }),
    ).toEqual({
      AND: [
        { catalogVisibility: { in: [CatalogVisibility.VISIBLE] } },
        {
          OR: [
            { symbol: { contains: 'spy', mode: 'insensitive' } },
            { name: { contains: 'spy', mode: 'insensitive' } },
            { isin: { contains: 'SPY', mode: 'insensitive' } },
            { benchmark: { contains: 'spy', mode: 'insensitive' } },
          ],
        },
        { category: FundCategory.INDEX },
        { vehicle: FundVehicleType.ETF },
        { currency: 'USD' },
        { provider: FundProvider.FINANCIAL_MODELING_PREP },
        { benchmark: { contains: 'S&P 500', mode: 'insensitive' } },
        { riskLevel: 4 },
        { score: { gte: 70, lte: 90 } },
        { ter: { gte: 0.05, lte: 0.5 } },
      ],
    });
  });

  it('should support open-ended score and ter ranges', () => {
    expect(
      buildFundListWhereInput({
        minScore: 80,
      }).AND,
    ).toEqual([
      { catalogVisibility: { in: [CatalogVisibility.VISIBLE] } },
      { score: { gte: 80 } },
    ]);

    expect(
      buildFundListWhereInput({
        maxTer: 0.2,
      }).AND,
    ).toEqual([
      { catalogVisibility: { in: [CatalogVisibility.VISIBLE] } },
      { ter: { lte: 0.2 } },
    ]);
  });

  it('should filter by idealForBeginners when requested', () => {
    expect(
      buildFundListWhereInput({
        idealForBeginnersOnly: true,
      }),
    ).toEqual({
      AND: [
        { catalogVisibility: { in: [CatalogVisibility.VISIBLE] } },
        { idealForBeginners: true },
      ],
    });
  });

  it('should map sort fields to Prisma order clauses', () => {
    expect(buildFundListOrderByInput('score', 'desc')).toEqual({
      score: 'desc',
    });
    expect(buildFundListOrderByInput('symbol', 'asc')).toEqual({
      symbol: 'asc',
    });
  });

  it('should calculate pagination metadata', () => {
    expect(buildFundListMeta(1, 20, 0)).toEqual({
      page: 1,
      limit: 20,
      total: 0,
      totalPages: 0,
    });
    expect(buildFundListMeta(2, 10, 25)).toEqual({
      page: 2,
      limit: 10,
      total: 25,
      totalPages: 3,
    });
  });
});
