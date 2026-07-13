import { InvestmentTheme } from '@prisma/client';
import {
  buildFundListMeta,
  buildFundListOrderByInput,
  buildFundListWhereInput,
  buildPublicCatalogVisibilityWhereInput,
} from './fund-list.mapper';
import { fundListQuerySchema } from './fund-list.schema';

describe('fundListQuerySchema', () => {
  it('should apply pagination and sorting defaults', () => {
    expect(fundListQuerySchema.parse({})).toEqual({
      page: 1,
      limit: 20,
      sortBy: 'score',
      sortOrder: 'desc',
    });
  });

  it('should parse filters and normalize currency', () => {
    expect(
      fundListQuerySchema.parse({
        q: 'spdr',
        currency: 'usd',
        category: 'index',
        vehicle: 'etf',
        provider: 'financial-modeling-prep',
        riskLevel: '4',
        minScore: '70',
        maxTer: '0.2',
        page: '2',
        limit: '10',
        sortBy: 'name',
        sortOrder: 'asc',
      }),
    ).toEqual({
      page: 2,
      limit: 10,
      sortBy: 'name',
      sortOrder: 'asc',
      q: 'spdr',
      currency: 'USD',
      category: 'index',
      vehicle: 'etf',
      provider: 'financial-modeling-prep',
      riskLevel: 4,
      minScore: 70,
      maxTer: 0.2,
    });
  });

  it('should parse idealForBeginnersOnly as a boolean filter', () => {
    expect(
      fundListQuerySchema.parse({ idealForBeginnersOnly: 'true' }),
    ).toMatchObject({ idealForBeginnersOnly: true });

    expect(
      fundListQuerySchema.parse({ idealForBeginnersOnly: 'false' }),
    ).toMatchObject({ idealForBeginnersOnly: false });
  });

  it('should parse investmentTheme filter', () => {
    expect(
      fundListQuerySchema.parse({ investmentTheme: 'us-equity' }),
    ).toMatchObject({ investmentTheme: 'us-equity' });
  });
});

describe('buildFundListWhereInput', () => {
  it('should build search and metric filters', () => {
    expect(
      buildFundListWhereInput(
        fundListQuerySchema.parse({
          q: 'SPY',
          minScore: 70,
          maxTer: 0.2,
          riskLevel: 4,
        }),
      ),
    ).toEqual({
      AND: [
        buildPublicCatalogVisibilityWhereInput(),
        {
          OR: [
            { symbol: { contains: 'SPY', mode: 'insensitive' } },
            { name: { contains: 'SPY', mode: 'insensitive' } },
            { isin: { contains: 'SPY', mode: 'insensitive' } },
            { benchmark: { contains: 'SPY', mode: 'insensitive' } },
          ],
        },
        { riskLevel: 4 },
        { score: { gte: 70 } },
        { ter: { lte: 0.2 } },
      ],
    });
  });
  it('should build investment theme filters', () => {
    expect(
      buildFundListWhereInput(
        fundListQuerySchema.parse({ investmentTheme: 'technology' }),
      ),
    ).toEqual({
      AND: [
        buildPublicCatalogVisibilityWhereInput(),
        { investmentTheme: InvestmentTheme.TECHNOLOGY },
      ],
    });
  });
});

describe('buildFundListOrderByInput', () => {
  it('should map sort fields to Prisma columns', () => {
    expect(buildFundListOrderByInput('ter', 'asc')).toEqual({ ter: 'asc' });
  });

  it('should map return snapshot sorts to materialized columns', () => {
    expect(buildFundListOrderByInput('return1y', 'desc')).toEqual({
      return1y: 'desc',
    });
    expect(buildFundListOrderByInput('return3y', 'asc')).toEqual({
      return3y: 'asc',
    });
  });
});

describe('buildFundListWhereInput beginner protection', () => {
  it('should enforce minimum score 30 for idealForBeginnersOnly', () => {
    expect(
      buildFundListWhereInput(
        fundListQuerySchema.parse({ idealForBeginnersOnly: 'true' }),
      ),
    ).toEqual({
      AND: [
        buildPublicCatalogVisibilityWhereInput(),
        { score: { gte: 30 } },
        { idealForBeginners: true },
      ],
    });
  });
});

describe('buildFundListMeta', () => {
  it('should calculate total pages', () => {
    expect(buildFundListMeta(2, 20, 42)).toEqual({
      page: 2,
      limit: 20,
      total: 42,
      totalPages: 3,
    });
  });
});
