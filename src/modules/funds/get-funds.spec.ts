import { BadRequestException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { AppConfigService } from '../../shared/config/config.service';
import { FundsRepository } from './repositories/funds.repository';
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
  });

  it('should keep null scores on catalog list reads', async () => {
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

    const response = await useCase.execute({
      page: '1',
      limit: '20',
      sortBy: 'score',
      sortOrder: 'desc',
    });

    expect(response.data[0]?.score).toBeNull();
  });

  it('should reject invalid query parameters', async () => {
    await expect(
      useCase.execute({
        page: '0',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('should sort by one-year return using materialized columns', async () => {
    repository.findMany.mockResolvedValue({
      items: [fund],
      total: 1,
    });

    await useCase.execute({
      page: '1',
      limit: '20',
      sortBy: 'return1y',
      sortOrder: 'desc',
    });

    expect(repository.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        skip: 0,
        take: 20,
        orderBy: { return1y: 'desc' },
      }),
    );
  });

  it('should sort by three-year return using materialized columns', async () => {
    repository.findMany.mockResolvedValue({
      items: [fund],
      total: 1,
    });

    await useCase.execute({
      page: '1',
      limit: '20',
      sortBy: 'return3y',
      sortOrder: 'asc',
    });

    expect(repository.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        orderBy: { return3y: 'asc' },
      }),
    );
  });

  it('should filter by minimum one-year return in the database query', async () => {
    repository.findMany.mockResolvedValue({
      items: [fund],
      total: 1,
    });

    await useCase.execute({
      page: '1',
      limit: '20',
      sortBy: 'score',
      sortOrder: 'desc',
      minReturn1y: '5',
    });

    const findManyMock = repository.findMany as jest.MockedFunction<
      FundsRepository['findMany']
    >;
    const findManyCall = findManyMock.mock.calls[0]?.[0];

    expect(findManyCall?.where?.AND).toEqual(
      expect.arrayContaining([{ return1y: { gte: 5 } }]),
    );
  });
});
