import { Test, TestingModule } from '@nestjs/testing';
import { FinancialModelingPrepProvider } from '../../providers/financial-modeling-prep/financial-modeling-prep.provider';
import { FundsRepository } from '../repositories/funds.repository';
import { FundPricesService } from './fund-prices.service';
import { FundSyncService } from './fund-sync.service';

describe('FundSyncService', () => {
  let service: FundSyncService;
  let fmpProvider: { getIndexFundDetail: jest.Mock };
  let fundsRepository: { upsert: jest.Mock };
  let fundPricesService: { saveProviderPrices: jest.Mock };

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
      getIndexFundDetail: jest.fn().mockResolvedValue({
        symbol: 'SPY',
        name: 'State Street SPDR S&P 500 ETF Trust',
        isin: 'US78462F1030',
        expenseRatio: 0.0945,
        assetsUnderManagement: 520_000_000_000,
        currency: 'USD',
        benchmark: 'S&P 500',
        priceSummary: {
          latestDate: '2024-01-31',
          latestClose: 482.88,
          periodStartDate: '2024-01-02',
          periodStartClose: 472.65,
          periodReturnPercent: 2.16,
          periodHigh: 489.08,
          periodLow: 470.49,
        },
      }),
    };
    fundsRepository = {
      upsert: jest.fn().mockResolvedValue({
        fund: persistedFund,
        created: true,
      }),
    };
    fundPricesService = {
      saveProviderPrices: jest.fn().mockResolvedValue(2),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FundSyncService,
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

    service = module.get<FundSyncService>(FundSyncService);
  });

  it('should sync normalized fund metadata from FMP into PostgreSQL', async () => {
    await expect(service.syncFromFmp('spy')).resolves.toEqual({
      fund: persistedFund,
      created: true,
    });

    expect(fmpProvider.getIndexFundDetail).toHaveBeenCalledWith('SPY', {
      from: undefined,
      to: undefined,
      includeHistory: false,
    });
    expect(fundsRepository.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        symbol: 'SPY',
        provider: 'financial-modeling-prep',
        category: 'index',
        currency: 'USD',
        benchmark: 'S&P 500',
        metrics: expect.objectContaining({
          ter: 0.0945,
          aum: 520_000_000_000,
        }),
      }),
    );
    expect(fundPricesService.saveProviderPrices).not.toHaveBeenCalled();
  });

  it('should persist provider prices when includePrices is enabled', async () => {
    fmpProvider.getIndexFundDetail.mockResolvedValueOnce({
      symbol: 'SPY',
      name: 'State Street SPDR S&P 500 ETF Trust',
      currency: 'USD',
      priceSummary: {
        latestDate: '2024-01-31',
        latestClose: 482.88,
        periodStartDate: '2024-01-02',
        periodStartClose: 472.65,
        periodReturnPercent: 2.16,
        periodHigh: 489.08,
        periodLow: 470.49,
      },
      history: [
        {
          date: '2024-01-31',
          open: 488.62,
          high: 489.08,
          low: 482.86,
          close: 482.88,
        },
        {
          date: '2024-01-30',
          open: 490.56,
          high: 491.62,
          low: 490.11,
          close: 490.89,
        },
      ],
    });

    await expect(
      service.syncFromFmp('SPY', {
        includePrices: true,
        historyFrom: '2024-01-01',
        historyTo: '2024-01-31',
      }),
    ).resolves.toEqual({
      fund: persistedFund,
      created: true,
      pricesSynced: 2,
    });

    expect(fmpProvider.getIndexFundDetail).toHaveBeenCalledWith('SPY', {
      from: '2024-01-01',
      to: '2024-01-31',
      includeHistory: true,
    });
    expect(fundPricesService.saveProviderPrices).toHaveBeenCalledWith(
      persistedFund.id,
      expect.arrayContaining([
        expect.objectContaining({ date: '2024-01-31' }),
        expect.objectContaining({ date: '2024-01-30' }),
      ]),
    );
  });
});
