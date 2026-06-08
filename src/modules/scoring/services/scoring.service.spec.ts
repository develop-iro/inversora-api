import { Test, TestingModule } from '@nestjs/testing';
import { FundsRepository } from '../../funds/repositories/funds.repository';
import { FundCompositionService } from '../../funds/services/fund-composition.service';
import { FundPricesService } from '../../funds/services/fund-prices.service';
import type { FundScoringMetrics } from '../entities/invesora-score.schema';
import { ScoringService } from './scoring.service';

const fund = {
  id: '550e8400-e29b-41d4-a716-446655440000',
  symbol: 'SPY',
  isin: 'US78462F1030',
  name: 'State Street SPDR S&P 500 ETF Trust',
  provider: 'financial-modeling-prep' as const,
  category: 'index' as const,
  currency: 'USD',
  benchmark: 'S&P 500',
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
  createdAt: new Date('2024-01-01T00:00:00.000Z'),
  updatedAt: new Date('2024-02-01T00:00:00.000Z'),
};

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
    updateScore: jest.Mock;
  };

  beforeEach(async () => {
    fundsRepository = {
      findById: jest.fn().mockResolvedValue(fund),
      findAll: jest.fn().mockResolvedValue([fund]),
      updateScore: jest
        .fn()
        .mockImplementation((id: string, score: number) => ({
          ...fund,
          id,
          score,
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
      ],
    }).compile();

    service = module.get(ScoringService);
  });

  it('should return a score between 0 and 100 with factor breakdown', () => {
    const result = service.calculateFundScore(fund, scoringMetrics);

    expect(result.score).toBeGreaterThanOrEqual(0);
    expect(result.score).toBeLessThanOrEqual(100);
    expect(result.breakdown.riskAdjustedReturn.maxPoints).toBe(40);
    expect(result.breakdown.cost.maxPoints).toBe(15);
    expect(result.breakdown.riskAdjustedReturn.points).toBeGreaterThan(
      result.breakdown.cost.points,
    );
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

    expect(result.breakdown.riskAdjustedReturn.incomplete).toBe(true);
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

  it('should skip recalculation when there are no funds', async () => {
    fundsRepository.findAll.mockResolvedValueOnce([]);

    await expect(service.recalculateAllScores()).resolves.toEqual({
      total: 0,
      updated: 0,
      results: [],
    });
    expect(fundsRepository.updateScore).not.toHaveBeenCalled();
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
    expect(fundsRepository.updateScore).toHaveBeenCalledWith(
      fund.id,
      expect.any(Number),
    );
  });

  it('should skip persistence when a computed score is missing', async () => {
    jest.spyOn(service, 'calculateCategoryScores').mockReturnValue(new Map());

    await expect(service.recalculateAllScores()).resolves.toEqual({
      total: 1,
      updated: 0,
      results: [],
    });
    expect(fundsRepository.updateScore).not.toHaveBeenCalled();
  });
});
