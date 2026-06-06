import { FundCategory, FundProvider } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';
import { mapPrismaFundToFund } from './fund.mapper';

describe('mapPrismaFundToFund', () => {
  it('should map a Prisma fund row into the domain entity', () => {
    const createdAt = new Date('2024-01-01T00:00:00.000Z');
    const updatedAt = new Date('2024-02-01T00:00:00.000Z');

    expect(
      mapPrismaFundToFund({
        id: '550e8400-e29b-41d4-a716-446655440000',
        symbol: 'SPY',
        isin: 'US78462F1030',
        name: 'State Street SPDR S&P 500 ETF Trust',
        provider: FundProvider.FINANCIAL_MODELING_PREP,
        category: FundCategory.INDEX,
        currency: 'USD',
        benchmark: 'S&P 500',
        expenseRatio: new Decimal('0.0945'),
        riskLevel: 4,
        score: new Decimal('82.50'),
        createdAt,
        updatedAt,
      }),
    ).toEqual({
      id: '550e8400-e29b-41d4-a716-446655440000',
      symbol: 'SPY',
      isin: 'US78462F1030',
      name: 'State Street SPDR S&P 500 ETF Trust',
      provider: 'financial-modeling-prep',
      category: 'index',
      currency: 'USD',
      benchmark: 'S&P 500',
      expenseRatio: 0.0945,
      riskLevel: 4,
      score: 82.5,
      createdAt,
      updatedAt,
    });
  });
});
