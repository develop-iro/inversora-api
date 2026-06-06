import { NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { FinancialModelingPrepProvider } from '../../providers/financial-modeling-prep/financial-modeling-prep.provider';
import { FundsRepository } from '../repositories/funds.repository';
import { FundPriceSyncService } from './fund-price-sync.service';
import { FundPricesService } from './fund-prices.service';

describe('FundPriceSyncService', () => {
  let service: FundPriceSyncService;
  let fmpProvider: { getIndexFundHistory: jest.Mock };
  let fundsRepository: { findBySymbolAndProvider: jest.Mock };
  let fundPricesService: {
    getLatestDate: jest.Mock;
    saveProviderPrices: jest.Mock;
  };

  const persistedFund = {
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
    riskLevel: null,
    score: null,
    createdAt: new Date('2024-01-01T00:00:00.000Z'),
    updatedAt: new Date('2024-02-01T00:00:00.000Z'),
  };

  beforeEach(async () => {
    fmpProvider = {
      getIndexFundHistory: jest.fn().mockResolvedValue([
        {
          date: '2024-02-01',
          open: 485.05,
          high: 486.12,
          low: 483.44,
          close: 484.88,
        },
        {
          date: '2024-02-02',
          open: 484.9,
          high: 487.5,
          low: 484.2,
          close: 486.75,
        },
      ]),
    };
    fundsRepository = {
      findBySymbolAndProvider: jest.fn().mockResolvedValue(persistedFund),
    };
    fundPricesService = {
      getLatestDate: jest.fn().mockResolvedValue(null),
      saveProviderPrices: jest.fn().mockResolvedValue(2),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FundPriceSyncService,
        {
          provide: FinancialModelingPrepProvider,
          useValue: fmpProvider,
        },
        {
          provide: FundsRepository,
          useValue: fundsRepository,
        },
        {
          provide: FundPricesService,
          useValue: fundPricesService,
        },
      ],
    }).compile();

    service = module.get<FundPriceSyncService>(FundPriceSyncService);
  });

  it('should sync normalized provider prices into PostgreSQL', async () => {
    await expect(
      service.syncFromFmp('spy', {
        from: '2024-02-01',
        to: '2024-02-02',
        incremental: false,
      }),
    ).resolves.toEqual({
      fundId: persistedFund.id,
      symbol: 'SPY',
      pricesSynced: 2,
      from: '2024-02-01',
      to: '2024-02-02',
      upToDate: false,
    });

    expect(fundsRepository.findBySymbolAndProvider).toHaveBeenCalledWith(
      'SPY',
      'financial-modeling-prep',
    );
    expect(fmpProvider.getIndexFundHistory).toHaveBeenCalledWith('SPY', {
      from: '2024-02-01',
      to: '2024-02-02',
    });
    expect(fundPricesService.saveProviderPrices).toHaveBeenCalledWith(
      persistedFund.id,
      expect.arrayContaining([
        expect.objectContaining({ date: '2024-02-01' }),
        expect.objectContaining({ date: '2024-02-02' }),
      ]),
    );
  });

  it('should resume incremental syncs from the day after the latest price', async () => {
    fundPricesService.getLatestDate.mockResolvedValueOnce('2024-01-31');

    await service.syncFromFmp('SPY', { to: '2024-02-02' });

    expect(fmpProvider.getIndexFundHistory).toHaveBeenCalledWith('SPY', {
      from: '2024-02-01',
      to: '2024-02-02',
    });
  });

  it('should skip provider calls when the requested window is already persisted', async () => {
    fundPricesService.getLatestDate.mockResolvedValueOnce('2024-02-02');

    await expect(
      service.syncFromFmp('SPY', {
        to: '2024-02-01',
      }),
    ).resolves.toEqual({
      fundId: persistedFund.id,
      symbol: 'SPY',
      pricesSynced: 0,
      from: '2024-02-03',
      to: '2024-02-01',
      upToDate: true,
    });

    expect(fmpProvider.getIndexFundHistory).not.toHaveBeenCalled();
    expect(fundPricesService.saveProviderPrices).not.toHaveBeenCalled();
  });

  it('should throw when the fund has not been persisted yet', async () => {
    fundsRepository.findBySymbolAndProvider.mockResolvedValueOnce(null);

    await expect(service.syncFromFmp('QQQ')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });
});
