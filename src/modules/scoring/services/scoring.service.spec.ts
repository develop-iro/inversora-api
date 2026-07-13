import { Test, TestingModule } from '@nestjs/testing';
import { CatalogVisibilityService } from '../../funds/services/catalog-visibility.service';
import { FundsRepository } from '../../funds/repositories/funds.repository';
import { FundCompositionService } from '../../funds/services/fund-composition.service';
import { FundPricesService } from '../../funds/services/fund-prices.service';
import { buildFundTestFixture } from '../../funds/test-utils/fund.entity.fixtures';
import type { FundScoringMetrics } from '../entities/invesora-score.schema';
import { ScoringService } from './scoring.service';

const fund = buildFundTestFixture({
  id: '550e8400-e29b-41d4-a716-446655440000',
  symbol: 'SPY',
  isin: 'US78462F1030',
  name: 'State Street SPDR S&P 500 ETF Trust',
  provider: 'financial-modeling-prep' as const,
  category: 'index' as const,
  vehicle: 'etf' as const,
  currency: 'USD',
  benchmark: 'S&P 500',
  issuer: 'State Street',
  metrics: {
    volatility: 14.25,
    drawdown: -8.5,
    ter: 0.0945,
    aum: 500_000_000_000,
    per: null,
    dividendYield: null,
    trackingError: null,
  },
  riskLevel: 4,
  score: null,
  catalogVisibility: 'visible' as const,
  editorial: { badge: '', themeLabel: '', idealForBeginners: false },
  createdAt: new Date('2024-01-01T00:00:00.000Z'),
  updatedAt: new Date('2024-02-01T00:00:00.000Z'),
});

const scoringMetrics: FundScoringMetrics = {
  ...fund.metrics,
  return1Y: 18,
  return3Y: 12,
  holdingsCount: 505,
  top10Weight: 32,
  maxSectorWeight: 28,
  fundAgeYears: 30,
};

describe('ScoringService', () => {
  let service: ScoringService;
  let fundsRepository: {
    findById: jest.Mock;
    findAll: jest.Mock;
    updateMaterializedScoring: jest.Mock;
  };

  beforeEach(async () => {
    fundsRepository = {
      findById: jest.fn().mockResolvedValue(fund),
      findAll: jest.fn().mockResolvedValue([fund]),
      updateMaterializedScoring: jest
        .fn()
        .mockImplementation((id: string, input: { score: number }) => ({
          ...fund,
          id,
          score: input.score,
        })),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ScoringService,
        {
          provide: FundsRepository,
          useValue: fundsRepository,
        },
        {
          provide: FundPricesService,
          useValue: {
            getHistory: jest.fn().mockResolvedValue([]),
          },
        },
        {
          provide: FundCompositionService,
          useValue: {
            getHoldings: jest.fn().mockResolvedValue(null),
            getAllocationsByCategory: jest.fn().mockResolvedValue(null),
          },
        },
        {
          provide: CatalogVisibilityService,
          useValue: {
            applyAutomaticVisibilityRules: jest.fn().mockResolvedValue(fund),
          },
        },
      ],
    }).compile();

    service = module.get(ScoringService);
  });

  it('should return a score between 0 and 100 with RN-04 factor breakdown', () => {
    const result = service.calculateFundScore(fund, scoringMetrics);

    expect(result.score).toBeGreaterThanOrEqual(0);
    expect(result.score).toBeLessThanOrEqual(100);
    expect(result.version).toBe('rn-04');
    expect(result.breakdown.ter.maxPoints).toBe(40);
    expect(result.breakdown.tracking.maxPoints).toBe(40);
    expect(result.breakdown.aum.maxPoints).toBe(10);
    expect(result.breakdown.age.maxPoints).toBe(10);
    expect(
      result.breakdown.ter.points +
        result.breakdown.tracking.points +
        result.breakdown.aum.points +
        result.breakdown.age.points,
    ).toBe(result.score);
    expect(result.warnings).toContain(
      'La rentabilidad pasada no garantiza resultados futuros.',
    );
    expect(result.summary.length).toBeGreaterThan(0);
  });

  it('should mark incomplete factors and add a warning when data is missing', () => {
    const incompleteMetrics: FundScoringMetrics = {
      volatility: null,
      drawdown: null,
      ter: null,
      aum: null,
      per: null,
      dividendYield: null,
      trackingError: null,
      return1Y: null,
      return3Y: null,
      holdingsCount: null,
      top10Weight: null,
      maxSectorWeight: null,
      fundAgeYears: null,
    };

    const result = service.calculateFundScore(fund, incompleteMetrics);

    expect(result.breakdown.ter.incomplete).toBe(true);
    expect(result.breakdown.tracking.incomplete).toBe(true);
    expect(result.warnings).toContain(
      'Algunos datos del fondo están incompletos; el score usa una estimación conservadora.',
    );
  });

  it('should calculate score for a persisted fund id', async () => {
    const result = await service.calculateScoreForFundId(fund.id);

    expect(result).not.toBeNull();
    expect(result?.score).toBeGreaterThanOrEqual(0);
  });

  it('should return null when the fund id does not exist', async () => {
    fundsRepository.findById.mockResolvedValueOnce(null);

    await expect(service.calculateScoreForFundId(fund.id)).resolves.toBeNull();
  });

  it('should compare a fund against peers in the same benchmark group', async () => {
    const peerFund = {
      ...fund,
      id: '660e8400-e29b-41d4-a716-446655440001',
      symbol: 'VOO',
    };
    fundsRepository.findAll.mockResolvedValue([fund, peerFund]);

    const result = await service.calculateScoreForFundId(fund.id);

    expect(result).not.toBeNull();
    expect(typeof result?.score).toBe('number');
  });

  it('should calculate rounded scores for multiple fund ids', async () => {
    const peerFund = {
      ...fund,
      id: '660e8400-e29b-41d4-a716-446655440001',
      symbol: 'VOO',
    };
    fundsRepository.findAll.mockResolvedValue([fund, peerFund]);

    const scores = await service.calculateScoresForFundIds([fund.id]);

    expect(scores.get(fund.id)).toBeGreaterThanOrEqual(0);
    expect(scores.get(fund.id)).toBe(Math.round(scores.get(fund.id)!));
  });

  it('should return empty scores when no fund ids are requested', async () => {
    await expect(service.calculateScoresForFundIds([])).resolves.toEqual(
      new Map(),
    );
    expect(fundsRepository.findAll).not.toHaveBeenCalled();
  });

  it('should return empty scores when requested fund ids are not found', async () => {
    fundsRepository.findAll.mockResolvedValueOnce([fund]);

    await expect(
      service.calculateScoresForFundIds(['missing-fund-id']),
    ).resolves.toEqual(new Map());
  });

  it('should skip recalculation when there are no funds', async () => {
    fundsRepository.findAll.mockResolvedValueOnce([]);

    await expect(service.recalculateAllScores()).resolves.toEqual({
      total: 0,
      updated: 0,
      results: [],
    });
    expect(fundsRepository.updateMaterializedScoring).not.toHaveBeenCalled();
  });

  it('should recalculate and persist scores for all funds', async () => {
    const result = await service.recalculateAllScores();

    expect(result.total).toBe(1);
    expect(result.updated).toBe(1);
    expect(result.results).toEqual([
      expect.objectContaining({
        fundId: fund.id,
        symbol: 'SPY',
      }),
    ]);
    expect(fundsRepository.updateMaterializedScoring).toHaveBeenCalledWith(
      fund.id,
      expect.objectContaining({
        peerGroupKey: 's&p 500',
      }),
    );
  });

  it('should batch metrics loading when recalculating many funds', async () => {
    const funds = Array.from({ length: 5 }, (_, index) => ({
      ...fund,
      id: `550e8400-e29b-41d4-a716-44665544000${index}`,
      symbol: `FUND${index}`,
    }));
    fundsRepository.findAll.mockResolvedValueOnce(funds);

    const result = await service.recalculateAllScores();

    expect(result.total).toBe(5);
    expect(result.updated).toBe(5);
    expect(fundsRepository.updateMaterializedScoring).toHaveBeenCalledTimes(5);
  });

  it('should score funds within and across benchmark peer groups', () => {
    const peerFund = {
      ...fund,
      id: '660e8400-e29b-41d4-a716-446655440001',
      symbol: 'VOO',
    };
    const otherBenchmarkFund = {
      ...fund,
      id: '770e8400-e29b-41d4-a716-446655440002',
      symbol: 'EEM',
      benchmark: 'MSCI Emerging Markets',
    };

    const scores = service.calculateCategoryScores([
      { fund, metrics: scoringMetrics },
      { fund: peerFund, metrics: scoringMetrics },
      { fund: otherBenchmarkFund, metrics: scoringMetrics },
    ]);

    expect(scores.size).toBe(3);
    expect(scores.get(fund.id)?.score).toBeGreaterThanOrEqual(0);
    expect(scores.get(otherBenchmarkFund.id)?.score).toBeGreaterThanOrEqual(0);
  });

  it('should skip persistence when a computed score is missing', async () => {
    jest.spyOn(service, 'calculateCategoryScores').mockReturnValue(new Map());

    await expect(service.recalculateAllScores()).resolves.toEqual({
      total: 1,
      updated: 0,
      results: [],
    });
    expect(fundsRepository.updateMaterializedScoring).not.toHaveBeenCalled();
  });
});
