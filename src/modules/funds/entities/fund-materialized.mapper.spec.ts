import { Decimal } from '@prisma/client/runtime/client';
import { buildFundTestFixture } from '../test-utils/fund.entity.fixtures';
import {
  mapMaterializedFieldsToReturnSnapshot,
  mapPrismaFundMaterializedFields,
  mapUpdateFundMaterializedReturnsToPrisma,
  mapUpdateFundMaterializedScoringToPrisma,
  parsePersistedScoreBreakdown,
  resolvePersistedInvesoraScore,
} from './fund-materialized.mapper';

describe('fund-materialized.mapper', () => {
  it('should map Prisma materialized columns to domain fields', () => {
    expect(
      mapPrismaFundMaterializedFields({
        return1y: new Decimal('12.5'),
        return3y: null,
        returnYtd: new Decimal('3.1'),
        returnAsOf: new Date('2026-06-01T00:00:00.000Z'),
        scoreBreakdown: null,
        peerGroupKey: 's&p 500',
        peerRank: 2,
      }),
    ).toEqual({
      return1y: 12.5,
      return3y: null,
      returnYtd: 3.1,
      returnAsOf: '2026-06-01',
      scoreBreakdown: null,
      peerGroupKey: 's&p 500',
      peerRank: 2,
    });
  });

  it('should map materialized columns to API return snapshots', () => {
    const materialized = {
      return1y: 12.5,
      return3y: 8.2,
      returnYtd: 3.1,
      returnAsOf: '2026-06-01',
      scoreBreakdown: null,
      peerGroupKey: 's&p 500',
      peerRank: 2,
    };

    expect(mapMaterializedFieldsToReturnSnapshot(materialized)).toEqual({
      ytd: 3.1,
      oneYear: 12.5,
      threeYear: 8.2,
      asOf: '2026-06-01',
    });
  });

  it('should parse valid persisted score breakdown JSON', () => {
    const score = parsePersistedScoreBreakdown({
      score: 82,
      version: 'rn-04',
      breakdown: {
        ter: { points: 20, maxPoints: 25, label: 'TER' },
        tracking: { points: 18, maxPoints: 25, label: 'Tracking' },
        aum: { points: 22, maxPoints: 25, label: 'AUM' },
        age: { points: 22, maxPoints: 25, label: 'Age' },
      },
      summary: 'Buen equilibrio entre coste y seguimiento.',
      warnings: [],
    });

    expect(score?.score).toBe(82);
  });

  it('should return null for invalid persisted score breakdown JSON', () => {
    expect(parsePersistedScoreBreakdown({ score: 'invalid' })).toBeNull();
    expect(parsePersistedScoreBreakdown(null)).toBeNull();
    expect(parsePersistedScoreBreakdown(undefined)).toBeNull();
  });

  it('should prefer materialized score breakdown when present', () => {
    const breakdown = {
      score: 90,
      version: 'rn-04',
      breakdown: {
        ter: { points: 25, maxPoints: 25, label: 'TER' },
        tracking: { points: 25, maxPoints: 25, label: 'Tracking' },
        aum: { points: 20, maxPoints: 25, label: 'AUM' },
        age: { points: 20, maxPoints: 25, label: 'Age' },
      },
      summary: 'Excelente.',
      warnings: [],
    };
    const fund = buildFundTestFixture({
      id: '550e8400-e29b-41d4-a716-446655440000',
      symbol: 'SPY',
      isin: 'US78462F1030',
      name: 'SPY',
      provider: 'financial-modeling-prep',
      category: 'index',
      vehicle: 'etf',
      currency: 'USD',
      benchmark: 'S&P 500',
      metrics: {
        volatility: null,
        drawdown: null,
        ter: 0.09,
        aum: 100,
        per: null,
        dividendYield: null,
        trackingError: null,
      },
      riskLevel: 4,
      score: 82,
      catalogVisibility: 'visible',
      editorial: { badge: '', themeLabel: '', idealForBeginners: false },
      createdAt: new Date('2024-01-01T00:00:00.000Z'),
      updatedAt: new Date('2024-02-01T00:00:00.000Z'),
      materialized: {
        return1y: null,
        return3y: null,
        returnYtd: null,
        returnAsOf: null,
        scoreBreakdown: breakdown,
        peerGroupKey: 's&p 500',
        peerRank: 1,
      },
    });

    expect(resolvePersistedInvesoraScore(fund)).toEqual(breakdown);
  });

  it('should build a degraded score when only the scalar score is persisted', () => {
    const fund = buildFundTestFixture({
      id: '550e8400-e29b-41d4-a716-446655440000',
      symbol: 'SPY',
      isin: 'US78462F1030',
      name: 'SPY',
      provider: 'financial-modeling-prep',
      category: 'index',
      vehicle: 'etf',
      currency: 'USD',
      benchmark: 'S&P 500',
      metrics: {
        volatility: null,
        drawdown: null,
        ter: 0.09,
        aum: 100,
        per: null,
        dividendYield: null,
        trackingError: null,
      },
      riskLevel: 4,
      score: 82,
      catalogVisibility: 'visible',
      editorial: { badge: '', themeLabel: '', idealForBeginners: false },
      createdAt: new Date('2024-01-01T00:00:00.000Z'),
      updatedAt: new Date('2024-02-01T00:00:00.000Z'),
      materialized: {
        return1y: null,
        return3y: null,
        returnYtd: null,
        returnAsOf: null,
        scoreBreakdown: null,
        peerGroupKey: null,
        peerRank: null,
      },
    });

    const score = resolvePersistedInvesoraScore(fund);

    expect(score?.score).toBe(82);
    expect(score?.warnings).toContain(
      'Desglose detallado no disponible todavía.',
    );
    expect(score?.breakdown.ter.incomplete).toBe(true);
  });

  it('should return null when neither breakdown nor scalar score exist', () => {
    const fund = buildFundTestFixture({
      id: '550e8400-e29b-41d4-a716-446655440000',
      symbol: 'SPY',
      isin: 'US78462F1030',
      name: 'SPY',
      provider: 'financial-modeling-prep',
      category: 'index',
      vehicle: 'etf',
      currency: 'USD',
      benchmark: 'S&P 500',
      metrics: {
        volatility: null,
        drawdown: null,
        ter: 0.09,
        aum: 100,
        per: null,
        dividendYield: null,
        trackingError: null,
      },
      riskLevel: 4,
      score: null,
      catalogVisibility: 'visible',
      editorial: { badge: '', themeLabel: '', idealForBeginners: false },
      createdAt: new Date('2024-01-01T00:00:00.000Z'),
      updatedAt: new Date('2024-02-01T00:00:00.000Z'),
    });

    expect(resolvePersistedInvesoraScore(fund)).toBeNull();
  });

  it('should map materialized return updates to Prisma columns', () => {
    expect(
      mapUpdateFundMaterializedReturnsToPrisma({
        return1y: 10,
        return3y: 8,
        returnYtd: 2,
        returnAsOf: '2026-06-01',
      }),
    ).toMatchObject({
      return1y: 10,
      return3y: 8,
      returnYtd: 2,
    });

    expect(
      mapUpdateFundMaterializedReturnsToPrisma({
        return1y: 10,
        return3y: 8,
        returnYtd: 2,
        returnAsOf: '2026-06-01',
      }).returnAsOf,
    ).toEqual(new Date('2026-06-01T00:00:00.000Z'));

    expect(
      mapUpdateFundMaterializedReturnsToPrisma({
        return1y: null,
        return3y: null,
        returnYtd: null,
        returnAsOf: null,
      }).returnAsOf,
    ).toBeNull();
  });

  it('should map materialized scoring updates to Prisma columns', () => {
    const breakdown = {
      score: 80,
      version: 'rn-04',
      breakdown: {
        ter: { points: 20, maxPoints: 25, label: 'TER' },
        tracking: { points: 20, maxPoints: 25, label: 'Tracking' },
        aum: { points: 20, maxPoints: 25, label: 'AUM' },
        age: { points: 20, maxPoints: 25, label: 'Age' },
      },
      summary: 'OK',
      warnings: [],
    };

    expect(
      mapUpdateFundMaterializedScoringToPrisma({
        score: 80,
        scoreBreakdown: breakdown,
        peerGroupKey: 's&p 500',
        peerRank: 1,
      }),
    ).toEqual({
      score: 80,
      scoreBreakdown: breakdown,
      peerGroupKey: 's&p 500',
      peerRank: 1,
    });
  });
});
