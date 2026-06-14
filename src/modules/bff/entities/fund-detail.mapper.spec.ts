import type { Fund } from '../../funds/entities/fund.schema';
import type { InvesoraScore } from '../../scoring/entities/invesora-score.schema';
import type { FundPrice } from '../../funds/entities/fund-price.schema';
import {
  buildCategoryLabel,
  buildCurrentQuarterMetadata,
  buildFundDetailResponse,
  buildPerformanceSeries,
  buildReturnsByPeriod,
  buildReturnsByYear,
  filterPricesForYtd,
  formatFundAum,
  formatPercentValue,
  mapAllocationsToSlices,
  mapRiskLevelToApp,
  mapScoreBreakdownToApp,
  resolveDiversificationLevel,
  resolveMaxChartDateRange,
  resolveScoringStatus,
  resolveStabilityLabel,
} from './fund-detail.mapper';
import {
  isFundIsinIdentifier,
  normalizeFundIsin as parseIsin,
} from './fund-isin.utils';

const fund: Fund = {
  id: '550e8400-e29b-41d4-a716-446655440000',
  symbol: 'SPY',
  isin: 'US78462F1030',
  name: 'State Street SPDR S&P 500 ETF Trust',
  provider: 'financial-modeling-prep',
  category: 'index',
  currency: 'USD',
  benchmark: 'S&P 500',
  metrics: {
    volatility: 14.2,
    drawdown: 8.5,
    ter: 0.0945,
    aum: 520_000_000_000,
    per: null,
    dividendYield: null,
    trackingError: 0.03,
  },
  riskLevel: 4,
  score: 82,
  catalogVisibility: 'visible',
  createdAt: new Date('2024-01-01T00:00:00.000Z'),
  updatedAt: new Date('2024-02-01T00:00:00.000Z'),
};

const score: InvesoraScore = {
  score: 82,
  version: 'mvp-1',
  breakdown: {
    riskAdjustedReturn: {
      points: 30,
      maxPoints: 40,
      label: 'Rentabilidad ajustada al riesgo',
      incomplete: false,
    },
    risk: { points: 14, maxPoints: 20, label: 'Riesgo', incomplete: false },
    cost: {
      points: 12,
      maxPoints: 15,
      label: 'Comisión anual',
      incomplete: false,
    },
    diversification: {
      points: 8,
      maxPoints: 10,
      label: 'Diversificación',
      incomplete: true,
    },
    fundSize: {
      points: 9,
      maxPoints: 10,
      label: 'Tamaño del fondo',
      incomplete: false,
    },
    age: { points: 4, maxPoints: 5, label: 'Antigüedad', incomplete: false },
  },
  summary: 'Score sólido.',
  warnings: ['La rentabilidad pasada no garantiza resultados futuros.'],
};

describe('fund-isin.utils', () => {
  it('should detect ISIN route identifiers', () => {
    expect(isFundIsinIdentifier('US78462F1030')).toBe(true);
    expect(isFundIsinIdentifier('550e8400-e29b-41d4-a716-446655440000')).toBe(
      false,
    );
  });

  it('should normalize valid ISIN values', () => {
    expect(parseIsin('us78462f1030')).toBe('US78462F1030');
  });
});

describe('fund-detail.mapper', () => {
  it('should map backend risk levels to app labels', () => {
    expect(mapRiskLevelToApp(2)).toBe('low');
    expect(mapRiskLevelToApp(4)).toBe('medium');
    expect(mapRiskLevelToApp(7)).toBe('high');
    expect(mapRiskLevelToApp(null)).toBe('medium');
  });

  it('should map backend score breakdown to six app criteria', () => {
    const breakdown = mapScoreBreakdownToApp(score);
    const adjustedBreakdown = mapScoreBreakdownToApp({
      ...score,
      score: 91,
      breakdown: {
        ...score.breakdown,
        riskAdjustedReturn: {
          ...score.breakdown.riskAdjustedReturn,
          points: 38,
        },
      },
    });

    expect(breakdown).toHaveLength(6);
    expect(
      adjustedBreakdown.find((item) => item.id === 'consistency')?.points,
    ).toBeDefined();
    expect(breakdown.map((item) => item.id)).toEqual([
      'ter',
      'tracking',
      'aum',
      'age',
      'consistency',
      'dataQuality',
    ]);
    expect(
      breakdown.reduce((sum, item) => sum + item.points, 0),
    ).toBeGreaterThanOrEqual(score.score - 1);
  });

  it('should mark warning status when factors are incomplete', () => {
    expect(resolveScoringStatus(score)).toBe('warning');
    expect(
      resolveScoringStatus({
        ...score,
        warnings: [],
        breakdown: {
          ...score.breakdown,
          diversification: {
            ...score.breakdown.diversification,
            incomplete: false,
          },
        },
      }),
    ).toBe('ok');
  });

  it('should build a validated fund detail response', () => {
    const response = buildFundDetailResponse({
      fund,
      score,
      rank: 2,
      charts: {
        '1Y': {
          fundId: fund.id,
          period: '1Y',
          from: '2025-01-01',
          to: '2026-01-01',
          asOf: '2026-01-01',
          points: [{ date: '2025-01-01', close: 100, value: 100 }],
        },
        '3Y': {
          fundId: fund.id,
          period: '3Y',
          from: '2023-01-01',
          to: '2026-01-01',
          asOf: '2026-01-01',
          points: [],
        },
        '5Y': {
          fundId: fund.id,
          period: '5Y',
          from: '2021-01-01',
          to: '2026-01-01',
          asOf: '2026-01-01',
          points: [],
        },
      },
      ytdPrices: [],
      maxPrices: [
        {
          id: 'price-1',
          fundId: fund.id,
          date: '2024-01-02',
          open: 100,
          high: 101,
          low: 99,
          close: 100,
          volume: null,
          change: null,
          changePercent: null,
          vwap: null,
          createdAt: new Date('2024-01-02T00:00:00.000Z'),
          updatedAt: new Date('2024-01-02T00:00:00.000Z'),
        },
      ],
      allPrices: [
        {
          id: 'price-1',
          fundId: fund.id,
          date: '2024-01-02',
          open: 100,
          high: 101,
          low: 99,
          close: 100,
          volume: null,
          change: null,
          changePercent: null,
          vwap: null,
          createdAt: new Date('2024-01-02T00:00:00.000Z'),
          updatedAt: new Date('2024-01-02T00:00:00.000Z'),
        },
      ],
      countries: {
        fundId: fund.id,
        asOf: '2026-01-01',
        countries: [{ label: 'United States', weight: 99.1, sortOrder: 0 }],
      },
      sectors: {
        fundId: fund.id,
        asOf: '2026-01-01',
        sectors: [{ label: 'Technology', weight: 31.2, sortOrder: 0 }],
      },
      holdings: {
        fundId: fund.id,
        asOf: '2026-01-01',
        holdings: [
          {
            rank: 1,
            asset: 'AAPL',
            name: 'Apple Inc.',
            isin: null,
            weightPercentage: 7.1,
            marketValue: null,
            sharesNumber: null,
          },
        ],
      },
      allocationsByCategory: {},
    });

    expect(response.fund.isin).toBe('US78462F1030');
    expect(response.inversoraScore).toBe(82);
    expect(response.rank).toBe(2);
    expect(response.market.performanceByTimeframe['1y'].points).toHaveLength(1);
    expect(response.profile.exposureByTab.sectorial[0]?.label).toBe(
      'Technology',
    );
  });

  it('should format labels, AUM, and stability helpers', () => {
    expect(buildCategoryLabel({ ...fund, benchmark: null })).toBe(
      'Fondo indexado',
    );
    expect(formatFundAum(null, 'USD')).toBe('—');
    expect(formatFundAum(2_500_000_000, 'USD')).toBe('2.5 BUSD');
    expect(formatFundAum(850_000_000, 'USD')).toBe('850 MUSD');
    expect(formatFundAum(500_000, 'EUR')).toBe('500000 EUR');
    expect(formatPercentValue(null)).toBe('—');
    expect(formatPercentValue(12.4)).toBe('12,40 %');
    expect(resolveStabilityLabel(null)).toBe('Volatilidad no disponible');
    expect(resolveStabilityLabel(8)).toBe('Volatilidad baja');
    expect(resolveStabilityLabel(14)).toBe('Volatilidad media');
    expect(resolveStabilityLabel(22)).toBe('Volatilidad alta');
    expect(buildCurrentQuarterMetadata().quarterTag).toMatch(/^Q[1-4] \d{4}$/);
  });

  it('should map allocations and diversification thresholds', () => {
    expect(
      mapAllocationsToSlices([{ label: 'Technology', weight: 31.2 }])[0]?.icon,
    ).toBe('laptop');
    expect(resolveDiversificationLevel([])).toBe('medium');
    expect(
      resolveDiversificationLevel(
        Array.from({ length: 50 }, (_, index) => ({
          weightPercentage: index === 0 ? 5 : 0.5,
        })),
      ),
    ).toBe('high');
    expect(
      resolveDiversificationLevel(
        Array.from({ length: 25 }, () => ({ weightPercentage: 2 })),
      ),
    ).toBe('medium');
    expect(resolveDiversificationLevel([{ weightPercentage: 80 }])).toBe('low');
  });

  it('should build performance and return helpers from price history', () => {
    const prices: FundPrice[] = [
      {
        id: 'price-1',
        fundId: fund.id,
        date: '2024-01-02',
        open: 100,
        high: 101,
        low: 99,
        close: 100,
        volume: null,
        change: null,
        changePercent: null,
        vwap: null,
        createdAt: new Date('2024-01-02T00:00:00.000Z'),
        updatedAt: new Date('2024-01-02T00:00:00.000Z'),
      },
      {
        id: 'price-2',
        fundId: fund.id,
        date: '2025-01-02',
        open: 110,
        high: 111,
        low: 109,
        close: 110,
        volume: null,
        change: null,
        changePercent: null,
        vwap: null,
        createdAt: new Date('2025-01-02T00:00:00.000Z'),
        updatedAt: new Date('2025-01-02T00:00:00.000Z'),
      },
      {
        id: 'price-3',
        fundId: fund.id,
        date: '2026-01-02',
        open: 120,
        high: 121,
        low: 119,
        close: 120,
        volume: null,
        change: null,
        changePercent: null,
        vwap: null,
        createdAt: new Date('2026-01-02T00:00:00.000Z'),
        updatedAt: new Date('2026-01-02T00:00:00.000Z'),
      },
    ];

    expect(buildReturnsByPeriod([]).every((row) => row.percent === null)).toBe(
      true,
    );
    expect(buildReturnsByPeriod(prices)[1]?.percent).toBeCloseTo(9.09, 1);
    expect(buildReturnsByYear([])).toEqual([]);
    expect(buildReturnsByYear(prices).length).toBeGreaterThan(0);
    expect(
      buildReturnsByYear([
        {
          ...prices[0],
          date: '2024-06-01',
          close: 110,
        },
      ]).find((row) => row.year === 2023)?.percent,
    ).toBeNull();
    expect(filterPricesForYtd(prices, null)).toEqual([]);
    expect(filterPricesForYtd([], '2026-01-02')).toEqual([]);
    expect(filterPricesForYtd(prices, '2026-01-02')).toHaveLength(1);
    expect(resolveMaxChartDateRange(null).to).toBeNull();
    expect(resolveMaxChartDateRange('2026-01-02')).toEqual({
      from: '1970-01-01',
      to: '2026-01-02',
    });
    expect(
      buildPerformanceSeries('1y', [{ date: '2026-01-02', value: 100 }], null)
        .asOf,
    ).toContain('T');
    expect(
      buildPerformanceSeries(
        '1y',
        [{ date: '2026-01-02', value: 100 }],
        '2026-01-02T00:00:00.000Z',
      ).asOf,
    ).toBe('2026-01-02T00:00:00.000Z');
    expect(buildPerformanceSeries('1y', [], '2026-01-02').asOf).toBe(
      '2026-01-02T00:00:00.000Z',
    );
  });

  it('should flag non-beginner funds with high fees or risk', () => {
    const response = buildFundDetailResponse({
      fund: {
        ...fund,
        riskLevel: 7,
        metrics: { ...fund.metrics, ter: 0.8 },
      },
      score: { ...score, score: 60 },
      charts: {
        '1Y': {
          fundId: fund.id,
          period: '1Y',
          from: '2025-01-01',
          to: '2026-01-01',
          asOf: '2026-01-01',
          points: [],
        },
        '3Y': {
          fundId: fund.id,
          period: '3Y',
          from: '2023-01-01',
          to: '2026-01-01',
          asOf: '2026-01-01',
          points: [],
        },
        '5Y': {
          fundId: fund.id,
          period: '5Y',
          from: '2021-01-01',
          to: '2026-01-01',
          asOf: '2026-01-01',
          points: [],
        },
      },
      ytdPrices: [],
      maxPrices: [],
      allPrices: [],
      countries: { fundId: fund.id, asOf: null, countries: [] },
      sectors: { fundId: fund.id, asOf: null, sectors: [] },
      holdings: { fundId: fund.id, asOf: null, holdings: [] },
      allocationsByCategory: {
        regional: [{ label: 'US', weight: 90, sortOrder: 0 } as never],
        assetAllocation: [
          { label: 'Equity', weight: 99, sortOrder: 0 } as never,
        ],
        capitalization: [{ label: 'Large', weight: 80, sortOrder: 0 } as never],
      },
    });

    expect(response.fund.idealForBeginners).toBe(false);
    expect(response.fund.riskLevel).toBe('high');
    expect(response.profile.exposureByTab.regional).toHaveLength(1);
  });
});
