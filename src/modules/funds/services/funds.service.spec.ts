import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { GetFundsUseCase } from '../get-funds';
import { GetCatalogSummaryUseCase } from '../get-catalog-summary';
import { FundsRepository } from '../repositories/funds.repository';
import { CatalogVisibilityService } from './catalog-visibility.service';
import { FundCompositionService } from './fund-composition.service';
import { FundPricesService } from './fund-prices.service';
import { FundsService } from './funds.service';

const fund = {
  id: '550e8400-e29b-41d4-a716-446655440000',
  symbol: 'SPY',
  isin: 'US78462F1030',
  name: 'State Street SPDR S&P 500 ETF Trust',
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
};

describe('FundsService', () => {
  let service: FundsService;
  let getFundsUseCase: { execute: jest.Mock };
  let getCatalogSummaryUseCase: { execute: jest.Mock };
  let repository: { findMany: jest.Mock; findById: jest.Mock };
  let fundPricesService: {
    getLatestDate: jest.Mock;
    getHistory: jest.Mock;
  };
  let fundCompositionService: {
    getHoldings: jest.Mock;
    getAllocationsByCategory: jest.Mock;
  };

  beforeEach(async () => {
    getFundsUseCase = {
      execute: jest.fn(),
    };
    getCatalogSummaryUseCase = {
      execute: jest.fn(),
    };
    repository = {
      findMany: jest.fn().mockResolvedValue({
        items: [fund],
        total: 1,
      }),
      findById: jest.fn().mockResolvedValue(fund),
    };
    fundPricesService = {
      getLatestDate: jest.fn().mockResolvedValue('2024-01-31'),
      getHistory: jest.fn().mockResolvedValue([
        {
          id: '550e8400-e29b-41d4-a716-446655440001',
          fundId: fund.id,
          date: '2024-01-31',
          open: 488.62,
          high: 489.08,
          low: 482.86,
          close: 482.88,
          volume: null,
          change: null,
          changePercent: null,
          vwap: null,
          createdAt: new Date('2024-02-01T00:00:00.000Z'),
          updatedAt: new Date('2024-02-01T00:00:00.000Z'),
        },
      ]),
    };

    fundCompositionService = {
      getHoldings: jest.fn().mockResolvedValue({
        asOf: '2024-01-31',
        holdings: [
          {
            id: '550e8400-e29b-41d4-a716-446655440010',
            fundId: fund.id,
            asOf: '2024-01-31',
            rank: 1,
            asset: 'AAPL',
            name: 'Apple Inc.',
            isin: 'US0378331005',
            weightPercentage: 7.12,
            marketValue: 36_500_000_000,
            sharesNumber: 190_000_000,
            createdAt: new Date('2024-02-01T00:00:00.000Z'),
            updatedAt: new Date('2024-02-01T00:00:00.000Z'),
          },
        ],
      }),
      getAllocationsByCategory: jest
        .fn()
        .mockImplementation((_fundId: string, category: string) => {
          if (category === 'countries') {
            return Promise.resolve({
              asOf: '2024-01-31',
              allocations: [
                {
                  id: '550e8400-e29b-41d4-a716-446655440020',
                  fundId: fund.id,
                  asOf: '2024-01-31',
                  category: 'countries',
                  label: 'Estados Unidos',
                  weight: 62.4,
                  sortOrder: 0,
                  createdAt: new Date('2024-02-01T00:00:00.000Z'),
                  updatedAt: new Date('2024-02-01T00:00:00.000Z'),
                },
              ],
            });
          }

          return Promise.resolve({
            asOf: '2024-01-31',
            allocations: [
              {
                id: '550e8400-e29b-41d4-a716-446655440030',
                fundId: fund.id,
                asOf: '2024-01-31',
                category: 'sectorial',
                label: 'Tecnología',
                weight: 31.5,
                sortOrder: 0,
                createdAt: new Date('2024-02-01T00:00:00.000Z'),
                updatedAt: new Date('2024-02-01T00:00:00.000Z'),
              },
            ],
          });
        }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FundsService,
        {
          provide: GetFundsUseCase,
          useValue: getFundsUseCase,
        },
        {
          provide: GetCatalogSummaryUseCase,
          useValue: getCatalogSummaryUseCase,
        },
        {
          provide: FundsRepository,
          useValue: repository,
        },
        {
          provide: FundPricesService,
          useValue: fundPricesService,
        },
        {
          provide: FundCompositionService,
          useValue: fundCompositionService,
        },
        {
          provide: CatalogVisibilityService,
          useFactory: (repo: FundsRepository) =>
            new CatalogVisibilityService(repo),
          inject: [FundsRepository],
        },
      ],
    }).compile();

    service = module.get<FundsService>(FundsService);
  });

  it('should delegate fund list reads to GetFundsUseCase', async () => {
    const response = {
      data: [fund],
      meta: {
        page: 1,
        limit: 20,
        total: 1,
        totalPages: 1,
      },
    };
    getFundsUseCase.execute.mockResolvedValue(response);

    await expect(
      service.listFunds({
        page: '1',
        limit: '20',
        sortBy: 'score',
        sortOrder: 'desc',
      }),
    ).resolves.toBe(response);

    expect(getFundsUseCase.execute).toHaveBeenCalledWith({
      page: '1',
      limit: '20',
      sortBy: 'score',
      sortOrder: 'desc',
    });
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

  it('should hide non-visible funds from fund detail routes', async () => {
    repository.findById.mockResolvedValueOnce({
      ...fund,
      catalogVisibility: 'blocked',
    });

    await expect(service.getFundById(fund.id)).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('should return indexed chart data for a requested period', async () => {
    await expect(
      service.getFundChart('550e8400-e29b-41d4-a716-446655440000', {
        period: '1Y',
      }),
    ).resolves.toEqual({
      fundId: '550e8400-e29b-41d4-a716-446655440000',
      period: '1Y',
      from: '2023-01-31',
      to: '2024-01-31',
      asOf: '2024-01-31',
      points: [{ date: '2024-01-31', close: 482.88, value: 100 }],
    });

    expect(fundPricesService.getHistory).toHaveBeenCalledWith(fund.id, {
      from: '2023-01-31',
      to: '2024-01-31',
    });
  });

  it('should reject invalid chart periods', async () => {
    await expect(
      service.getFundChart('550e8400-e29b-41d4-a716-446655440000', {
        period: '10Y',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('should return ranked holdings for the latest snapshot', async () => {
    await expect(
      service.getFundHoldings('550e8400-e29b-41d4-a716-446655440000', {}),
    ).resolves.toEqual({
      fundId: '550e8400-e29b-41d4-a716-446655440000',
      asOf: '2024-01-31',
      holdings: [
        {
          id: '550e8400-e29b-41d4-a716-446655440010',
          rank: 1,
          asset: 'AAPL',
          name: 'Apple Inc.',
          isin: 'US0378331005',
          weightPercentage: 7.12,
          marketValue: 36_500_000_000,
          sharesNumber: 190_000_000,
        },
      ],
    });

    expect(fundCompositionService.getHoldings).toHaveBeenCalledWith(
      fund.id,
      undefined,
    );
  });

  it('should return an empty holdings payload when no snapshot exists', async () => {
    fundCompositionService.getHoldings.mockResolvedValueOnce(null);

    await expect(
      service.getFundHoldings('550e8400-e29b-41d4-a716-446655440000', {}),
    ).resolves.toEqual({
      fundId: '550e8400-e29b-41d4-a716-446655440000',
      asOf: null,
      holdings: [],
    });
  });

  it('should reject invalid holdings snapshot dates', async () => {
    await expect(
      service.getFundHoldings('550e8400-e29b-41d4-a716-446655440000', {
        asOf: '31-01-2024',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('should return country exposure for the latest snapshot', async () => {
    await expect(
      service.getFundCountryExposure(
        '550e8400-e29b-41d4-a716-446655440000',
        {},
      ),
    ).resolves.toEqual({
      fundId: '550e8400-e29b-41d4-a716-446655440000',
      asOf: '2024-01-31',
      countries: [
        {
          id: '550e8400-e29b-41d4-a716-446655440020',
          label: 'Estados Unidos',
          weight: 62.4,
          sortOrder: 0,
        },
      ],
    });

    expect(
      fundCompositionService.getAllocationsByCategory,
    ).toHaveBeenCalledWith(fund.id, 'countries', undefined);
  });

  it('should return an empty country exposure payload when no snapshot exists', async () => {
    fundCompositionService.getAllocationsByCategory.mockResolvedValueOnce(null);

    await expect(
      service.getFundCountryExposure(
        '550e8400-e29b-41d4-a716-446655440000',
        {},
      ),
    ).resolves.toEqual({
      fundId: '550e8400-e29b-41d4-a716-446655440000',
      asOf: null,
      countries: [],
    });
  });

  it('should reject invalid country exposure snapshot dates', async () => {
    await expect(
      service.getFundCountryExposure('550e8400-e29b-41d4-a716-446655440000', {
        asOf: '31-01-2024',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('should return sector exposure for the latest snapshot', async () => {
    await expect(
      service.getFundSectorExposure('550e8400-e29b-41d4-a716-446655440000', {}),
    ).resolves.toEqual({
      fundId: '550e8400-e29b-41d4-a716-446655440000',
      asOf: '2024-01-31',
      sectors: [
        {
          id: '550e8400-e29b-41d4-a716-446655440030',
          label: 'Tecnología',
          weight: 31.5,
          sortOrder: 0,
        },
      ],
    });

    expect(
      fundCompositionService.getAllocationsByCategory,
    ).toHaveBeenCalledWith(fund.id, 'sectorial', undefined);
  });

  it('should return an empty sector exposure payload when no snapshot exists', async () => {
    fundCompositionService.getAllocationsByCategory.mockResolvedValueOnce(null);

    await expect(
      service.getFundSectorExposure('550e8400-e29b-41d4-a716-446655440000', {}),
    ).resolves.toEqual({
      fundId: '550e8400-e29b-41d4-a716-446655440000',
      asOf: null,
      sectors: [],
    });
  });

  it('should reject invalid sector exposure snapshot dates', async () => {
    await expect(
      service.getFundSectorExposure('550e8400-e29b-41d4-a716-446655440000', {
        asOf: '31-01-2024',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('should return not found for composition endpoints when the fund is missing', async () => {
    repository.findById.mockResolvedValue(null);

    await expect(
      service.getFundChart('550e8400-e29b-41d4-a716-446655440000', {
        period: '1Y',
      }),
    ).rejects.toBeInstanceOf(NotFoundException);
    await expect(
      service.getFundHoldings('550e8400-e29b-41d4-a716-446655440000', {}),
    ).rejects.toBeInstanceOf(NotFoundException);
    await expect(
      service.getFundCountryExposure(
        '550e8400-e29b-41d4-a716-446655440000',
        {},
      ),
    ).rejects.toBeInstanceOf(NotFoundException);
    await expect(
      service.getFundSectorExposure('550e8400-e29b-41d4-a716-446655440000', {}),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('should return an empty chart when no latest price exists', async () => {
    fundPricesService.getLatestDate.mockResolvedValueOnce(null);

    await expect(
      service.getFundChart('550e8400-e29b-41d4-a716-446655440000', {
        period: '1Y',
      }),
    ).resolves.toMatchObject({
      fundId: '550e8400-e29b-41d4-a716-446655440000',
      period: '1Y',
      to: null,
      asOf: null,
      points: [],
    });
    expect(fundPricesService.getHistory).not.toHaveBeenCalled();
  });
});
