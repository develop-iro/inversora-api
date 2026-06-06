import { FundCategory, FundProvider } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';
import {
  mapIndexFundProfileToUpsertFundInput,
  mapPrismaFundMetrics,
  mapPrismaFundToFund,
  mapUpsertFundInputToPrismaCreateData,
  normalizeOptionalFundIsin,
  resolveFundCurrencyFromProfile,
} from './fund.mapper';

const prismaFundRow = {
  id: '550e8400-e29b-41d4-a716-446655440000',
  symbol: 'SPY',
  isin: 'US78462F1030',
  name: 'State Street SPDR S&P 500 ETF Trust',
  provider: FundProvider.FINANCIAL_MODELING_PREP,
  category: FundCategory.INDEX,
  currency: 'USD',
  benchmark: 'S&P 500',
  volatility: new Decimal('14.2500'),
  drawdown: new Decimal('-8.5000'),
  ter: new Decimal('0.0945'),
  aum: new Decimal('500000000000.00'),
  per: new Decimal('24.5000'),
  dividendYield: new Decimal('1.3200'),
  trackingError: new Decimal('0.0500'),
  riskLevel: 4,
  score: new Decimal('82.50'),
  createdAt: new Date('2024-01-01T00:00:00.000Z'),
  updatedAt: new Date('2024-02-01T00:00:00.000Z'),
};

describe('mapPrismaFundMetrics', () => {
  it('should map persisted metric columns into the domain metrics object', () => {
    expect(mapPrismaFundMetrics(prismaFundRow)).toEqual({
      volatility: 14.25,
      drawdown: -8.5,
      ter: 0.0945,
      aum: 500_000_000_000,
      per: 24.5,
      dividendYield: 1.32,
      trackingError: 0.05,
    });
  });
});

describe('mapPrismaFundToFund', () => {
  it('should map a Prisma fund row into the domain entity', () => {
    const { createdAt, updatedAt } = prismaFundRow;

    expect(mapPrismaFundToFund(prismaFundRow)).toEqual({
      id: '550e8400-e29b-41d4-a716-446655440000',
      symbol: 'SPY',
      isin: 'US78462F1030',
      name: 'State Street SPDR S&P 500 ETF Trust',
      provider: 'financial-modeling-prep',
      category: 'index',
      currency: 'USD',
      benchmark: 'S&P 500',
      metrics: {
        volatility: 14.25,
        drawdown: -8.5,
        ter: 0.0945,
        aum: 500_000_000_000,
        per: 24.5,
        dividendYield: 1.32,
        trackingError: 0.05,
      },
      riskLevel: 4,
      score: 82.5,
      createdAt,
      updatedAt,
    });
  });
});

describe('resolveFundCurrencyFromProfile', () => {
  it('should prefer profile currency and fall back to navCurrency or USD', () => {
    expect(
      resolveFundCurrencyFromProfile({
        symbol: 'SPY',
        name: 'SPY',
        currency: 'usd',
      }),
    ).toBe('USD');

    expect(
      resolveFundCurrencyFromProfile({
        symbol: 'EUNL',
        name: 'iShares Core MSCI World UCITS ETF',
        navCurrency: 'EUR',
      }),
    ).toBe('EUR');

    expect(
      resolveFundCurrencyFromProfile({
        symbol: 'INVALID',
        name: 'Invalid Currency Fund',
        currency: 'US DOLLAR',
      }),
    ).toBe('USD');
  });
});

describe('normalizeOptionalFundIsin', () => {
  it('should normalize valid ISIN values and reject invalid ones', () => {
    expect(normalizeOptionalFundIsin('us78462f1030')).toBe('US78462F1030');
    expect(normalizeOptionalFundIsin('INVALID')).toBeNull();
    expect(normalizeOptionalFundIsin('')).toBeNull();
    expect(normalizeOptionalFundIsin(undefined)).toBeUndefined();
  });
});

describe('mapIndexFundProfileToUpsertFundInput', () => {
  it('should map a normalized provider profile into an upsert input', () => {
    expect(
      mapIndexFundProfileToUpsertFundInput({
        symbol: 'spy',
        name: 'State Street SPDR S&P 500 ETF Trust',
        isin: 'US78462F1030',
        expenseRatio: 0.0945,
        assetsUnderManagement: 520_000_000_000,
        currency: 'USD',
        benchmark: 'S&P 500',
      }),
    ).toEqual({
      symbol: 'SPY',
      isin: 'US78462F1030',
      name: 'State Street SPDR S&P 500 ETF Trust',
      provider: 'financial-modeling-prep',
      category: 'index',
      currency: 'USD',
      benchmark: 'S&P 500',
      metrics: {
        ter: 0.0945,
        aum: 520_000_000_000,
        volatility: null,
        drawdown: null,
        per: null,
        dividendYield: null,
        trackingError: null,
      },
    });
  });
});

describe('mapUpsertFundInputToPrismaCreateData', () => {
  it('should map upsert input fields to Prisma create payload columns', () => {
    expect(
      mapUpsertFundInputToPrismaCreateData({
        symbol: 'SPY',
        isin: 'US78462F1030',
        name: 'State Street SPDR S&P 500 ETF Trust',
        provider: 'financial-modeling-prep',
        category: 'index',
        currency: 'USD',
        benchmark: 'S&P 500',
        metrics: {
          ter: 0.0945,
          aum: 520_000_000_000,
        },
      }),
    ).toEqual({
      symbol: 'SPY',
      isin: 'US78462F1030',
      name: 'State Street SPDR S&P 500 ETF Trust',
      provider: FundProvider.FINANCIAL_MODELING_PREP,
      category: FundCategory.INDEX,
      currency: 'USD',
      benchmark: 'S&P 500',
      ter: 0.0945,
      aum: 520_000_000_000,
      volatility: null,
      drawdown: null,
      per: null,
      dividendYield: null,
      trackingError: null,
      riskLevel: null,
      score: null,
    });
  });
});
