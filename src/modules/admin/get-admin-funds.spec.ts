import { BadRequestException } from '@nestjs/common';
import { CatalogVisibility } from '@prisma/client';
import { Test, TestingModule } from '@nestjs/testing';
import { AppConfigService } from '../../shared/config/config.service';
import { buildFundTestFixture } from '../funds/test-utils/fund.entity.fixtures';
import { FundsRepository } from '../funds/repositories/funds.repository';
import { GetAdminFundsUseCase } from './get-admin-funds';

describe('GetAdminFundsUseCase', () => {
  let useCase: GetAdminFundsUseCase;
  let fundsRepository: { findMany: jest.Mock };

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
    issuer: null,
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
  });

  beforeEach(async () => {
    fundsRepository = {
      findMany: jest.fn().mockResolvedValue({ items: [fund], total: 1 }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GetAdminFundsUseCase,
        {
          provide: FundsRepository,
          useValue: fundsRepository,
        },
        {
          provide: AppConfigService,
          useValue: { brandfetchClientId: undefined },
        },
      ],
    }).compile();

    useCase = module.get(GetAdminFundsUseCase);
  });

  it('should return a paginated admin fund list', async () => {
    const response = await useCase.execute({
      page: '1',
      limit: '20',
      sortBy: 'score',
      sortOrder: 'desc',
    });

    expect(response.data).toHaveLength(1);
    expect(response.meta.total).toBe(1);
    expect(fundsRepository.findMany).toHaveBeenCalled();
  });

  it('should throw when query parameters are invalid', async () => {
    await expect(useCase.execute({ page: '0' })).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it('should honor explicit catalog visibility filters', async () => {
    await useCase.execute({
      page: '1',
      limit: '20',
      sortBy: 'score',
      sortOrder: 'desc',
      catalogVisibility: ['visible'],
    });

    expect(fundsRepository.findMany).toHaveBeenCalledWith({
      where: {
        AND: [
          {
            catalogVisibility: {
              in: [CatalogVisibility.VISIBLE],
            },
          },
        ],
      },
      orderBy: { score: 'desc' },
      skip: 0,
      take: 20,
    });
  });
});
