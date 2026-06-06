import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { FundsRepository } from '../repositories/funds.repository';
import { FundsService } from './funds.service';

const fund = {
  id: '550e8400-e29b-41d4-a716-446655440000',
  symbol: 'SPY',
  isin: 'US78462F1030',
  name: 'State Street SPDR S&P 500 ETF Trust',
  provider: 'financial-modeling-prep',
  category: 'index',
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
  createdAt: new Date('2024-01-01T00:00:00.000Z'),
  updatedAt: new Date('2024-02-01T00:00:00.000Z'),
};

describe('FundsService', () => {
  let service: FundsService;
  let repository: { findMany: jest.Mock; findById: jest.Mock };

  beforeEach(async () => {
    repository = {
      findMany: jest.fn().mockResolvedValue({
        items: [fund],
        total: 1,
      }),
      findById: jest.fn().mockResolvedValue(fund),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FundsService,
        {
          provide: FundsRepository,
          useValue: repository,
        },
      ],
    }).compile();

    service = module.get<FundsService>(FundsService);
  });

  it('should return a paginated fund list', async () => {
    await expect(
      service.listFunds({
        page: '1',
        limit: '20',
        sortBy: 'score',
        sortOrder: 'desc',
      }),
    ).resolves.toEqual({
      data: [fund],
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
      service.listFunds({
        page: '0',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('should return a fund by id', async () => {
    await expect(
      service.getFundById('550e8400-e29b-41d4-a716-446655440000'),
    ).resolves.toEqual(fund);

    expect(repository.findById).toHaveBeenCalledWith(
      '550e8400-e29b-41d4-a716-446655440000',
    );
  });

  it('should reject invalid fund ids', async () => {
    await expect(service.getFundById('not-a-uuid')).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it('should return not found when the fund does not exist', async () => {
    repository.findById.mockResolvedValueOnce(null);

    await expect(
      service.getFundById('550e8400-e29b-41d4-a716-446655440000'),
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});
