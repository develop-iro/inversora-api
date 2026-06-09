import type { Fund } from '../../funds/entities/fund.schema';
import type { InvesoraScore } from '../../scoring/entities/invesora-score.schema';
import {
  buildFundDetailResponse,
  mapRiskLevelToApp,
  mapScoreBreakdownToApp,
  resolveScoringStatus,
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

    expect(breakdown).toHaveLength(6);
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
});
