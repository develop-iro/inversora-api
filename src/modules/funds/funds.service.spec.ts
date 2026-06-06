import { Test, TestingModule } from '@nestjs/testing';
import type { IFundDataAdapter } from './adapters/fund-data.adapter';
import { FundsService } from './funds.service';
import { FUND_DATA_ADAPTER } from './funds.tokens';
import { FinancialModelingPrepProvider } from '../providers/financial-modeling-prep/financial-modeling-prep.provider';

describe('FundsService', () => {
  let service: FundsService;
  let fmpProvider: {
    searchIndexFunds: jest.Mock;
    getIndexFundHistory: jest.Mock;
    getIndexFundDetail: jest.Mock;
  };
  let fundDataAdapter: jest.Mocked<IFundDataAdapter>;

  beforeEach(async () => {
    fmpProvider = {
      searchIndexFunds: jest.fn(),
      getIndexFundHistory: jest.fn(),
      getIndexFundDetail: jest.fn(),
    };

    fundDataAdapter = {
      source: 'financial-modeling-prep',
      adaptSearchResults: jest.fn(),
      adaptPriceHistory: jest.fn(),
      adaptProfile: jest.fn(),
      adaptDetail: jest.fn(),
      adaptSearchResponse: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FundsService,
        {
          provide: FinancialModelingPrepProvider,
          useValue: fmpProvider,
        },
        {
          provide: FUND_DATA_ADAPTER,
          useValue: fundDataAdapter,
        },
      ],
    }).compile();

    service = module.get<FundsService>(FundsService);
  });

  it('should search index funds through the provider and adapter', async () => {
    fmpProvider.searchIndexFunds.mockResolvedValue([
      {
        symbol: 'SPY',
        name: 'State Street SPDR S&P 500 ETF Trust',
        exchange: 'AMEX',
      },
    ]);
    fundDataAdapter.adaptSearchResults.mockReturnValue([
      {
        symbol: 'SPY',
        name: 'State Street SPDR S&P 500 ETF Trust',
        fundType: 'index',
        exchangeCode: 'AMEX',
      },
    ]);
    fundDataAdapter.adaptSearchResponse.mockReturnValue({
      items: [
        {
          symbol: 'SPY',
          name: 'State Street SPDR S&P 500 ETF Trust',
          fundType: 'index',
          exchangeCode: 'AMEX',
        },
      ],
      source: 'financial-modeling-prep',
    });

    await expect(service.searchIndexFunds('spy', { limit: 1 })).resolves.toEqual({
      items: [
        {
          symbol: 'SPY',
          name: 'State Street SPDR S&P 500 ETF Trust',
          fundType: 'index',
          exchangeCode: 'AMEX',
        },
      ],
      source: 'financial-modeling-prep',
    });

    expect(fmpProvider.searchIndexFunds).toHaveBeenCalledWith('spy', {
      limit: 1,
    });
    expect(fundDataAdapter.adaptSearchResults).toHaveBeenCalledWith([
      {
        symbol: 'SPY',
        name: 'State Street SPDR S&P 500 ETF Trust',
        exchange: 'AMEX',
      },
    ]);
  });

  it('should return adapted historical prices', async () => {
    fmpProvider.getIndexFundHistory.mockResolvedValue([
      {
        date: '2024-01-31',
        open: 488.62,
        high: 489.08,
        low: 482.86,
        close: 482.88,
        volume: 126011100,
      },
    ]);
    fundDataAdapter.adaptPriceHistory.mockReturnValue([
      {
        date: '2024-01-31',
        open: 488.62,
        high: 489.08,
        low: 482.86,
        close: 482.88,
        volume: 126011100,
      },
    ]);

    await expect(
      service.getIndexFundHistory('SPY', {
        from: '2024-01-01',
        to: '2024-01-31',
      }),
    ).resolves.toEqual([
      {
        date: '2024-01-31',
        open: 488.62,
        high: 489.08,
        low: 482.86,
        close: 482.88,
        volume: 126011100,
      },
    ]);
  });

  it('should return adapted fund detail aggregates', async () => {
    fmpProvider.getIndexFundDetail.mockResolvedValue({
      symbol: 'SPY',
      name: 'State Street SPDR S&P 500 ETF Trust',
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
    });
    fundDataAdapter.adaptDetail.mockReturnValue({
      symbol: 'SPY',
      name: 'State Street SPDR S&P 500 ETF Trust',
      fundType: 'index',
      benchmark: 'S&P 500',
      metrics: {},
      performance: {
        asOfDate: '2024-01-31',
        latestClose: 482.88,
        periodStartDate: '2024-01-02',
        periodStartClose: 472.65,
        periodReturnPercent: 2.16,
        periodHigh: 489.08,
        periodLow: 470.49,
      },
    });

    await expect(service.getIndexFundDetail('SPY')).resolves.toEqual({
      symbol: 'SPY',
      name: 'State Street SPDR S&P 500 ETF Trust',
      fundType: 'index',
      benchmark: 'S&P 500',
      metrics: {},
      performance: {
        asOfDate: '2024-01-31',
        latestClose: 482.88,
        periodStartDate: '2024-01-02',
        periodStartClose: 472.65,
        periodReturnPercent: 2.16,
        periodHigh: 489.08,
        periodLow: 470.49,
      },
    });
  });
});
