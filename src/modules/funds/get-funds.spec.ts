import { BadRequestException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { AppConfigService } from '../../shared/config/config.service';
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

  it('should reject invalid query parameters', async () => {
    await expect(
      useCase.execute({
        page: '0',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});
