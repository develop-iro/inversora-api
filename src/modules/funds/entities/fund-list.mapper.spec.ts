import {
  CatalogVisibility,
  FundCategory,
  FundProvider,
  FundVehicleType,
  InvestmentTheme,
} from '@prisma/client';
import {
  buildFundListMeta,
  buildFundListOrderByInput,
  buildFundListWhereInput,
  buildPublicCatalogVisibilityWhereInput,
  isReturnBasedSortField,
  requiresReturnEnrichment,
} from './fund-list.mapper';

describe('fund-list.mapper', () => {
  it('should default to public catalog visibility filtering', () => {
    expect(buildFundListWhereInput({})).toEqual({
      AND: [buildPublicCatalogVisibilityWhereInput()],
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
        buildPublicCatalogVisibilityWhereInput(),
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
      buildPublicCatalogVisibilityWhereInput(),
      { score: { gte: 80 } },
    ]);

    expect(
      buildFundListWhereInput({
        maxScore: 90,
      }).AND,
    ).toEqual([
      buildPublicCatalogVisibilityWhereInput(),
      { score: { lte: 90 } },
    ]);

    expect(
      buildFundListWhereInput({
        maxTer: 0.2,
      }).AND,
    ).toEqual([
      buildPublicCatalogVisibilityWhereInput(),
      { ter: { lte: 0.2 } },
    ]);

    expect(
      buildFundListWhereInput({
        minTer: 0.05,
      }).AND,
    ).toEqual([
      buildPublicCatalogVisibilityWhereInput(),
      { ter: { gte: 0.05 } },
    ]);
  });

  it('should filter by materialized return thresholds', () => {
    expect(
      buildFundListWhereInput({
        minReturn1y: 5,
        minReturn3y: 10,
      }),
    ).toEqual({
      AND: [
        buildPublicCatalogVisibilityWhereInput(),
        { return1y: { gte: 5 } },
        { return3y: { gte: 10 } },
      ],
    });
  });

  it('should raise the minimum score floor for beginner-only listings', () => {
    expect(
      buildFundListWhereInput({
        idealForBeginnersOnly: true,
        minScore: 40,
      }),
    ).toEqual({
      AND: [
        buildPublicCatalogVisibilityWhereInput(),
        { score: { gte: 40 } },
        { idealForBeginners: true },
      ],
    });
  });

  it('should filter by idealForBeginners when requested', () => {
    expect(
      buildFundListWhereInput({
        idealForBeginnersOnly: true,
      }),
    ).toEqual({
      AND: [
        buildPublicCatalogVisibilityWhereInput(),
        { score: { gte: 30 } },
        { idealForBeginners: true },
      ],
    });
  });

  it('should filter by investment theme when requested', () => {
    expect(
      buildFundListWhereInput({
        investmentTheme: 'technology',
      }),
    ).toEqual({
      AND: [
        buildPublicCatalogVisibilityWhereInput(),
        { investmentTheme: InvestmentTheme.TECHNOLOGY },
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

  it('should identify return-based sort fields', () => {
    expect(isReturnBasedSortField('return1y')).toBe(true);
    expect(isReturnBasedSortField('return3y')).toBe(true);
    expect(isReturnBasedSortField('score')).toBe(false);
  });

  it('should not require return enrichment on list reads', () => {
    expect(requiresReturnEnrichment()).toBe(false);
  });

  it('should order by materialized return columns', () => {
    expect(buildFundListOrderByInput('return1y', 'desc')).toEqual({
      return1y: 'desc',
    });
    expect(buildFundListOrderByInput('return3y', 'asc')).toEqual({
      return3y: 'asc',
    });
  });
});
