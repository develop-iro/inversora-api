import { Test, TestingModule } from '@nestjs/testing';
import { FundsRepository } from '../../funds/repositories/funds.repository';
import { buildFundTestFixture } from '../../funds/test-utils/fund.entity.fixtures';
import { ScoringReadService } from './scoring-read.service';

describe('ScoringReadService', () => {
  let service: ScoringReadService;
  let fundsRepository: { findById: jest.Mock };

  beforeEach(async () => {
    fundsRepository = {
      findById: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ScoringReadService,
        {
          provide: FundsRepository,
          useValue: fundsRepository,
        },
      ],
    }).compile();

    service = module.get(ScoringReadService);
  });

  it('should return null when the fund does not exist', async () => {
    fundsRepository.findById.mockResolvedValueOnce(null);

    await expect(
      service.getPersistedScoreByFundId('550e8400-e29b-41d4-a716-446655440000'),
    ).resolves.toBeNull();
  });

  it('should return persisted score breakdown when available', async () => {
    const breakdown = {
      score: 88,
      version: 'rn-04',
      breakdown: {
        ter: { points: 20, maxPoints: 25, label: 'TER' },
        tracking: { points: 20, maxPoints: 25, label: 'Tracking' },
        aum: { points: 24, maxPoints: 25, label: 'AUM' },
        age: { points: 24, maxPoints: 25, label: 'Age' },
      },
      summary: 'Muy eficiente.',
      warnings: [],
    };
    fundsRepository.findById.mockResolvedValueOnce(
      buildFundTestFixture({
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
        score: 88,
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
      }),
    );

    await expect(
      service.getPersistedScoreByFundId('550e8400-e29b-41d4-a716-446655440000'),
    ).resolves.toEqual(breakdown);
  });

  it('should return degraded score when only scalar score is persisted', async () => {
    fundsRepository.findById.mockResolvedValueOnce(
      buildFundTestFixture({
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
        score: 70,
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
      }),
    );

    const score = await service.getPersistedScoreByFundId(
      '550e8400-e29b-41d4-a716-446655440000',
    );

    expect(score?.score).toBe(70);
    expect(score?.warnings).toContain(
      'Desglose detallado no disponible todavía.',
    );
  });
});
