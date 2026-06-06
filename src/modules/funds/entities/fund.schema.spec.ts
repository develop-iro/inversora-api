import {
  createFundInputSchema,
  fundSchema,
  updateFundInputSchema,
} from './fund.schema';

describe('fundSchema', () => {
  const validFund = {
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
    createdAt: '2024-01-01T00:00:00.000Z',
    updatedAt: '2024-02-01T00:00:00.000Z',
  };

  it('should validate a complete fund entity', () => {
    expect(fundSchema.parse(validFund)).toEqual({
      ...validFund,
      createdAt: new Date(validFund.createdAt),
      updatedAt: new Date(validFund.updatedAt),
    });
  });

  it('should allow nullable analytical fields', () => {
    expect(
      fundSchema.parse({
        ...validFund,
        isin: null,
        benchmark: null,
        expenseRatio: null,
        riskLevel: null,
        score: null,
      }),
    ).toMatchObject({
      isin: null,
      benchmark: null,
      expenseRatio: null,
      riskLevel: null,
      score: null,
    });
  });

  it('should reject invalid ISIN, currency, and score values', () => {
    expect(() =>
      fundSchema.parse({
        ...validFund,
        isin: 'INVALID',
      }),
    ).toThrow();

    expect(() =>
      fundSchema.parse({
        ...validFund,
        currency: 'US',
      }),
    ).toThrow();

    expect(() =>
      fundSchema.parse({
        ...validFund,
        score: 101,
      }),
    ).toThrow();
  });

  it('should validate create and update input schemas', () => {
    expect(
      createFundInputSchema.parse({
        symbol: 'SPY',
        name: 'State Street SPDR S&P 500 ETF Trust',
        provider: 'financial-modeling-prep',
        category: 'index',
        currency: 'USD',
      }),
    ).toEqual({
      symbol: 'SPY',
      name: 'State Street SPDR S&P 500 ETF Trust',
      provider: 'financial-modeling-prep',
      category: 'index',
      currency: 'USD',
    });

    expect(
      updateFundInputSchema.parse({
        score: 90,
        riskLevel: 3,
      }),
    ).toEqual({
      score: 90,
      riskLevel: 3,
    });
  });
});
