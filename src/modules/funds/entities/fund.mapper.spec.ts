import {
  CatalogVisibility as PrismaCatalogVisibility,
  FundCategory as PrismaFundCategory,
  FundProvider as PrismaFundProvider,
  FundVehicleType as PrismaFundVehicleType,
  InvestmentTheme as PrismaInvestmentTheme,
} from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/client';
import type { FundCategory, FundProvider } from './fund.schema';
import {
  mapFundMetricsToPrismaFields,
  mapProviderFundProfileToUpsertFundInput,
  mapDomainFundCategoryToPrisma,
  mapDomainFundProviderToPrisma,
  mapDomainFundVehicleToPrisma,
  mapDomainCatalogVisibilityToPrisma,
  mapDomainInvestmentThemeToPrisma,
  mapPrismaCatalogVisibility,
  mapPrismaFundCategory,
  mapPrismaFundMetrics,
  mapPrismaFundProvider,
  mapPrismaFundToFund,
  mapPrismaFundVehicle,
  mapPrismaInvestmentTheme,
  normalizeOptionalFundDomicile,
  normalizeOptionalProviderText,
  mapUpdateFundEditorialInputToPrismaData,
  mapUpsertFundInputToPrismaCreateData,
  mapUpsertFundInputToPrismaUpdateData,
  normalizeOptionalFundIsin,
  resolveFundCurrencyFromProfile,
} from './fund.mapper';

const prismaFundRow = {
  id: '550e8400-e29b-41d4-a716-446655440000',
  symbol: 'SPY',
  isin: 'US78462F1030',
  name: 'State Street SPDR S&P 500 ETF Trust',
  provider: PrismaFundProvider.FINANCIAL_MODELING_PREP,
  category: PrismaFundCategory.INDEX,
  vehicle: PrismaFundVehicleType.ETF,
  currency: 'USD',
  benchmark: 'S&P 500',
  assetClass: 'Equity',
  domicile: 'US',
  investmentTheme: PrismaInvestmentTheme.US_EQUITY,
  issuer: null,
  volatility: new Decimal('14.2500'),
  drawdown: new Decimal('-8.5000'),
  ter: new Decimal('0.0945'),
  aum: new Decimal('500000000000.00'),
  per: new Decimal('24.5000'),
  dividendYield: new Decimal('1.3200'),
  trackingError: new Decimal('0.0500'),
  riskLevel: 4,
  score: new Decimal('82.50'),
  catalogVisibility: PrismaCatalogVisibility.VISIBLE,
  badge: 'Núcleo USA',
  themeLabel: 'Referencia S&P 500',
  idealForBeginners: true,
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

  it('should map null metric columns to null in the domain object', () => {
    expect(
      mapPrismaFundMetrics({
        ...prismaFundRow,
        volatility: null,
        drawdown: null,
        ter: null,
        aum: null,
        per: null,
        dividendYield: null,
        trackingError: null,
      }),
    ).toEqual({
      volatility: null,
      drawdown: null,
      ter: null,
      aum: null,
      per: null,
      dividendYield: null,
      trackingError: null,
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
      vehicle: 'etf',
      currency: 'USD',
      benchmark: 'S&P 500',
      assetClass: 'Equity',
      domicile: 'US',
      investmentTheme: 'us-equity',
      issuer: null,
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
      editorial: {
        badge: 'Núcleo USA',
        themeLabel: 'Referencia S&P 500',
        idealForBeginners: true,
      },
      catalogVisibility: 'visible',
      createdAt,
      updatedAt,
    });
  });
});

describe('catalog visibility mappers', () => {
  it('should map Prisma catalog visibility values to the domain enum', () => {
    expect(mapPrismaCatalogVisibility(PrismaCatalogVisibility.VISIBLE)).toBe(
      'visible',
    );
    expect(
      mapPrismaCatalogVisibility(PrismaCatalogVisibility.QUARANTINED),
    ).toBe('quarantined');
    expect(mapPrismaCatalogVisibility(PrismaCatalogVisibility.BLOCKED)).toBe(
      'blocked',
    );
  });

  it('should map domain catalog visibility values to Prisma enums', () => {
    expect(mapDomainCatalogVisibilityToPrisma('visible')).toBe(
      PrismaCatalogVisibility.VISIBLE,
    );
    expect(mapDomainCatalogVisibilityToPrisma('quarantined')).toBe(
      PrismaCatalogVisibility.QUARANTINED,
    );
    expect(mapDomainCatalogVisibilityToPrisma('blocked')).toBe(
      PrismaCatalogVisibility.BLOCKED,
    );
  });
});

describe('investment theme mappers', () => {
  const themePairs = [
    [PrismaInvestmentTheme.GLOBAL_EQUITY, 'global-equity'],
    [PrismaInvestmentTheme.US_EQUITY, 'us-equity'],
    [PrismaInvestmentTheme.EUROPE_EQUITY, 'europe-equity'],
    [PrismaInvestmentTheme.EMERGING_EQUITY, 'emerging-equity'],
    [PrismaInvestmentTheme.FIXED_INCOME, 'fixed-income'],
    [PrismaInvestmentTheme.MULTI_ASSET, 'multi-asset'],
    [PrismaInvestmentTheme.TECHNOLOGY, 'technology'],
    [PrismaInvestmentTheme.ESG, 'esg'],
    [PrismaInvestmentTheme.SECTOR_OTHER, 'sector-other'],
    [PrismaInvestmentTheme.UNCLASSIFIED, 'unclassified'],
  ] as const;

  it.each(themePairs)(
    'should map Prisma investment theme %s to domain value %s',
    (prismaTheme, domainTheme) => {
      expect(mapPrismaInvestmentTheme(prismaTheme)).toBe(domainTheme);
      expect(mapDomainInvestmentThemeToPrisma(domainTheme)).toBe(prismaTheme);
    },
  );
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

    expect(
      resolveFundCurrencyFromProfile({
        symbol: 'FALLBACK',
        name: 'Fallback Currency Fund',
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

describe('fund vehicle mappers', () => {
  it('should map Prisma and domain fund vehicle values', () => {
    expect(mapPrismaFundVehicle(PrismaFundVehicleType.ETF)).toBe('etf');
    expect(mapPrismaFundVehicle(PrismaFundVehicleType.MUTUAL_FUND)).toBe(
      'mutual-fund',
    );
    expect(mapDomainFundVehicleToPrisma('etf')).toBe(PrismaFundVehicleType.ETF);
    expect(mapDomainFundVehicleToPrisma('mutual-fund')).toBe(
      PrismaFundVehicleType.MUTUAL_FUND,
    );
  });
});

describe('provider text normalizers', () => {
  it('should normalize optional provider text and domicile values', () => {
    expect(normalizeOptionalProviderText('  Equity ')).toBe('Equity');
    expect(normalizeOptionalProviderText('   ')).toBeNull();
    expect(normalizeOptionalFundDomicile(' ie ')).toBe('IE');
    expect(normalizeOptionalFundDomicile('INVALID')).toBeNull();
    expect(normalizeOptionalFundDomicile('')).toBeNull();
  });
});

describe('mapProviderFundProfileToUpsertFundInput', () => {
  it('should map a normalized provider profile into an upsert input', () => {
    expect(
      mapProviderFundProfileToUpsertFundInput({
        symbol: 'spy',
        name: 'State Street SPDR S&P 500 ETF Trust',
        vehicle: 'etf',
        isin: 'US78462F1030',
        expenseRatio: 0.0945,
        assetsUnderManagement: 520_000_000_000,
        currency: 'USD',
        benchmark: 'S&P 500',
        issuer: 'State Street',
      }),
    ).toEqual({
      symbol: 'SPY',
      isin: 'US78462F1030',
      name: 'State Street SPDR S&P 500 ETF Trust',
      issuer: 'State Street',
      provider: 'financial-modeling-prep',
      category: 'index',
      vehicle: 'etf',
      currency: 'USD',
      assetClass: null,
      domicile: null,
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

  it('should map omitted optional profile fields to null metrics and benchmark', () => {
    expect(
      mapProviderFundProfileToUpsertFundInput({
        symbol: 'qqq',
        name: 'Invesco QQQ Trust',
        vehicle: 'etf',
      }),
    ).toEqual({
      symbol: 'QQQ',
      isin: undefined,
      name: 'Invesco QQQ Trust',
      provider: 'financial-modeling-prep',
      category: 'index',
      vehicle: 'etf',
      currency: 'USD',
      assetClass: null,
      domicile: null,
      benchmark: null,
      issuer: null,
      metrics: {
        ter: null,
        aum: null,
        volatility: null,
        drawdown: null,
        per: null,
        dividendYield: null,
        trackingError: null,
      },
    });
  });

  it('should map asset class, domicile, and mutual-fund vehicle fields', () => {
    expect(
      mapProviderFundProfileToUpsertFundInput({
        symbol: 'vtsax',
        name: 'Vanguard Total Stock Market Index Fund',
        vehicle: 'mutual-fund',
        assetClass: 'Equity',
        domicile: 'us',
      }),
    ).toMatchObject({
      symbol: 'VTSAX',
      vehicle: 'mutual-fund',
      assetClass: 'Equity',
      domicile: 'US',
    });
  });
});

describe('mapFundMetricsToPrismaFields', () => {
  it('should default all metric columns to null when metrics are omitted', () => {
    expect(mapFundMetricsToPrismaFields()).toEqual({
      volatility: null,
      drawdown: null,
      ter: null,
      aum: null,
      per: null,
      dividendYield: null,
      trackingError: null,
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
        vehicle: 'etf',
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
      provider: PrismaFundProvider.FINANCIAL_MODELING_PREP,
      category: PrismaFundCategory.INDEX,
      vehicle: PrismaFundVehicleType.ETF,
      currency: 'USD',
      assetClass: null,
      domicile: null,
      benchmark: 'S&P 500',
      issuer: null,
      catalogVisibility: PrismaCatalogVisibility.VISIBLE,
      badge: '',
      themeLabel: '',
      idealForBeginners: false,
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

  it('should map explicit catalog visibility on create payloads', () => {
    expect(
      mapUpsertFundInputToPrismaCreateData({
        symbol: 'SPY',
        name: 'State Street SPDR S&P 500 ETF Trust',
        provider: 'financial-modeling-prep',
        category: 'index',
        vehicle: 'etf',
        currency: 'USD',
        catalogVisibility: 'blocked',
      }).catalogVisibility,
    ).toBe(PrismaCatalogVisibility.BLOCKED);
  });
});

describe('mapUpsertFundInputToPrismaUpdateData', () => {
  it('should map upsert input fields to Prisma update payload columns', () => {
    expect(
      mapUpsertFundInputToPrismaUpdateData({
        symbol: 'SPY',
        isin: null,
        name: 'Updated Fund Name',
        provider: 'financial-modeling-prep',
        category: 'index',
        vehicle: 'etf',
        currency: 'USD',
        benchmark: null,
        metrics: {
          ter: 0.1,
        },
        riskLevel: 3,
        score: 75,
      }),
    ).toEqual({
      isin: null,
      name: 'Updated Fund Name',
      issuer: null,
      category: PrismaFundCategory.INDEX,
      vehicle: PrismaFundVehicleType.ETF,
      currency: 'USD',
      assetClass: null,
      domicile: null,
      benchmark: null,
      ter: 0.1,
      volatility: null,
      drawdown: null,
      aum: null,
      per: null,
      dividendYield: null,
      trackingError: null,
      riskLevel: 3,
      score: 75,
    });
  });
});

describe('mapUpdateFundEditorialInputToPrismaData', () => {
  it('should map only provided editorial fields', () => {
    expect(mapUpdateFundEditorialInputToPrismaData({ badge: 'Test' })).toEqual({
      badge: 'Test',
    });
    expect(
      mapUpdateFundEditorialInputToPrismaData({ themeLabel: 'Global' }),
    ).toEqual({
      themeLabel: 'Global',
    });
    expect(
      mapUpdateFundEditorialInputToPrismaData({ idealForBeginners: true }),
    ).toEqual({
      idealForBeginners: true,
    });
  });
});

describe('domain enum mappers', () => {
  it('should map domain provider and category values to Prisma enums', () => {
    expect(mapDomainFundProviderToPrisma('financial-modeling-prep')).toBe(
      PrismaFundProvider.FINANCIAL_MODELING_PREP,
    );
    expect(mapDomainFundCategoryToPrisma('index')).toBe(
      PrismaFundCategory.INDEX,
    );
  });

  it('should pass through unknown enum values in exhaustive default branches', () => {
    const unknownPrismaProvider = 'UNKNOWN' as PrismaFundProvider;
    expect(mapPrismaFundProvider(unknownPrismaProvider)).toBe(
      unknownPrismaProvider,
    );

    const unknownPrismaCategory = 'UNKNOWN' as PrismaFundCategory;
    expect(mapPrismaFundCategory(unknownPrismaCategory)).toBe(
      unknownPrismaCategory,
    );

    const unknownDomainProvider = 'unknown-provider' as FundProvider;
    expect(mapDomainFundProviderToPrisma(unknownDomainProvider)).toBe(
      unknownDomainProvider,
    );

    const unknownDomainCategory = 'unknown-category' as FundCategory;
    expect(mapDomainFundCategoryToPrisma(unknownDomainCategory)).toBe(
      unknownDomainCategory,
    );
  });
});
