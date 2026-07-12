import { BadRequestException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { AppConfigService } from '../../shared/config/config.service';
import { ScoringService } from '../scoring/services/scoring.service';
import { FundsRepository } from './repositories/funds.repository';
import { FundPricesService } from './services/fund-prices.service';
import { GetFundsUseCase } from './get-funds';
import { buildFundTestFixture } from './test-utils/fund.entity.fixtures';

const fund = buildFundTestFixture({
  id: '550e8400-e29b-41d4-a716-446655440000',
  symbol: 'SPY',
  isin: 'US78462F1030',
  name: 'State Street SPDR S&P 500 ETF Trust',
  issuer: 'State Street',
  provider: 'financial-modeling-prep',
  category: 'index',
  vehicle: 'etf',
  currency: 'USD',
  benchmark: 'S&P 500',
  metrics: {
    volatility: null,
    drawdown: null,
    ter: 0.0945,
    aum: 520_000_000_000,
    per: null,
    dividendYield: null,
    trackingError: null,
  },
  riskLevel: 4,
  score: 82.5,
  catalogVisibility: 'visible' as const,
  editorial: { badge: '', themeLabel: '', idealForBeginners: false },
  createdAt: new Date('2024-01-01T00:00:00.000Z'),
  updatedAt: new Date('2024-02-01T00:00:00.000Z'),
});

describe('GetFundsUseCase', () => {
  let useCase: GetFundsUseCase;
  let repository: { findMany: jest.Mock };
  let configService: { brandfetchClientId: string | undefined };
  let fundPricesService: { getHistoriesByFundIds: jest.Mock };
  let scoringService: { calculateScoresForFundIds: jest.Mock };

  beforeEach(async () => {
    repository = {
      findMany: jest.fn().mockResolvedValue({
        items: [fund],
        total: 1,
      }),
    };
    configService = {
      brandfetchClientId: 'test-client-id',
    };
    fundPricesService = {
      getHistoriesByFundIds: jest.fn().mockResolvedValue(new Map()),
    };
    scoringService = {
      calculateScoresForFundIds: jest.fn().mockResolvedValue(new Map()),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GetFundsUseCase,
        {
          provide: FundsRepository,
          useValue: repository,
        },
        {
          provide: AppConfigService,
          useValue: configService,
        },
        {
          provide: FundPricesService,
          useValue: fundPricesService,
        },
        {
          provide: ScoringService,
          useValue: scoringService,
        },
      ],
    }).compile();

    useCase = module.get(GetFundsUseCase);
  });

  it('should return a paginated fund list', async () => {
    await expect(
      useCase.execute({
        page: '1',
        limit: '20',
        sortBy: 'score',
        sortOrder: 'desc',
      }),
    ).resolves.toEqual({
      data: [
        {
          ...fund,
          logoUrl:
            'https://cdn.brandfetch.io/domain/ssga.com/w/64/h/64/theme/dark/fallback/lettermark?c=test-client-id',
          returns: {
            ytd: null,
            oneYear: null,
            threeYear: null,
            asOf: null,
          },
        },
      ],
      meta: {
        page: 1,
        limit: 20,
        total: 1,
        totalPages: 1,
      },
    });

    expect(repository.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        skip: 0,
        take: 20,
        orderBy: { score: 'desc' },
      }),
    );
  });

  it('should return persisted scores without live scoring enrichment', async () => {
    const response = await useCase.execute({
      page: '1',
      limit: '20',
      sortBy: 'score',
      sortOrder: 'desc',
    });

    expect(response.data[0]?.score).toBe(fund.score);
    expect(scoringService.calculateScoresForFundIds).not.toHaveBeenCalled();
  });

  it('should compute live scores only for funds missing persisted scores', async () => {
    const fundWithoutScore = {
      ...fund,
      id: '550e8400-e29b-41d4-a716-446655440099',
      symbol: 'MISS',
      score: null,
    };

    repository.findMany.mockResolvedValue({
      items: [fundWithoutScore],
      total: 1,
    });
    scoringService.calculateScoresForFundIds.mockResolvedValue(
      new Map([[fundWithoutScore.id, 76]]),
    );

    const response = await useCase.execute({
      page: '1',
      limit: '20',
      sortBy: 'score',
      sortOrder: 'desc',
    });

    expect(scoringService.calculateScoresForFundIds).toHaveBeenCalledWith([
      fundWithoutScore.id,
    ]);
    expect(response.data[0]?.score).toBe(76);
  });

  it('should reject invalid query parameters', async () => {
    await expect(
      useCase.execute({
        page: '0',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('should sort by one-year return after enrichment', async () => {
    const lowReturnFund = {
      ...fund,
      id: '550e8400-e29b-41d4-a716-446655440001',
      symbol: 'LOW',
      name: 'Low Return Fund',
    };
    const highReturnFund = {
      ...fund,
      id: '550e8400-e29b-41d4-a716-446655440002',
      symbol: 'HIGH',
      name: 'High Return Fund',
    };

    repository.findMany.mockResolvedValue({
      items: [lowReturnFund, highReturnFund],
      total: 2,
    });

    fundPricesService.getHistoriesByFundIds.mockResolvedValue(
      new Map([
        [
          '550e8400-e29b-41d4-a716-446655440001',
          [{ date: '2025-01-01', close: 100 }],
        ],
        [
          '550e8400-e29b-41d4-a716-446655440002',
          [{ date: '2025-01-01', close: 100 }],
        ],
      ]),
    );

    const response = await useCase.execute({
      page: '1',
      limit: '20',
      sortBy: 'return1y',
      sortOrder: 'desc',
    });

    expect(response.data).toHaveLength(2);
    expect(repository.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        skip: 0,
        take: 500,
      }),
    );
  });

  it('should sort by three-year return after enrichment', async () => {
    repository.findMany.mockResolvedValue({
      items: [fund],
      total: 1,
    });
    fundPricesService.getHistoriesByFundIds.mockResolvedValue(new Map());

    const response = await useCase.execute({
      page: '1',
      limit: '20',
      sortBy: 'return3y',
      sortOrder: 'asc',
    });

    expect(response.data).toHaveLength(1);
  });

  it('should use return enrichment path when filtering by minimum one-year return', async () => {
    repository.findMany.mockResolvedValue({
      items: [fund],
      total: 1,
    });
    fundPricesService.getHistoriesByFundIds.mockResolvedValue(new Map());

    await useCase.execute({
      page: '1',
      limit: '20',
      sortBy: 'score',
      sortOrder: 'desc',
      minReturn1y: '5',
    });

    expect(repository.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        skip: 0,
        take: 500,
      }),
    );
  });
});
