import { Test, TestingModule } from '@nestjs/testing';
import { AppConfigService } from '../../../shared/config/config.service';
import { ExternalHttpError } from '../../../shared/http/external-http.error';
import { FinancialModelingPrepClient } from './financial-modeling-prep.client';
import { FMP_PROVIDER_NAME } from './financial-modeling-prep.constants';
import { FinancialModelingPrepFixtureService } from './financial-modeling-prep.fixture.service';
import { FinancialModelingPrepProvider } from './financial-modeling-prep.provider';

describe('FinancialModelingPrepProvider', () => {
  let provider: FinancialModelingPrepProvider;
  let client: {
    searchBySymbol: jest.Mock;
    searchByName: jest.Mock;
    fetchFundProfile: jest.Mock;
    fetchHistoricalData: jest.Mock;
  };
  let fixtures: {
    readFixture: jest.Mock;
    filterSearchFixture: jest.Mock;
    filterHistoricalFixture: jest.Mock;
  };

  const configMock: Pick<AppConfigService, 'fmpUsesMocks'> = {
    fmpUsesMocks: true,
  };

  beforeEach(async () => {
    client = {
      searchBySymbol: jest.fn(),
      searchByName: jest.fn(),
      fetchFundProfile: jest.fn(),
      fetchHistoricalData: jest.fn(),
    };

    fixtures = {
      readFixture: jest.fn(),
      filterSearchFixture: jest.fn(),
      filterHistoricalFixture: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FinancialModelingPrepProvider,
        {
          provide: FinancialModelingPrepClient,
          useValue: client,
        },
        {
          provide: FinancialModelingPrepFixtureService,
          useValue: fixtures,
        },
        {
          provide: AppConfigService,
          useValue: configMock,
        },
      ],
    }).compile();

    provider = module.get<FinancialModelingPrepProvider>(
      FinancialModelingPrepProvider,
    );
  });

  it('should return an empty array for blank index fund searches', async () => {
    await expect(provider.searchIndexFunds('   ')).resolves.toEqual([]);
    expect(fixtures.readFixture).not.toHaveBeenCalled();
  });

  it('should search index funds from fixtures and normalize results', async () => {
    fixtures.readFixture.mockResolvedValue([
      {
        symbol: 'SPY',
        name: 'State Street SPDR S&P 500 ETF Trust',
        exchange: 'AMEX',
      },
      {
        symbol: 'SPYI',
        name: 'Neos S&P 500(R) High Income ETF',
        exchange: 'CBOE',
      },
    ]);
    fixtures.filterSearchFixture.mockImplementation((data: unknown[]) => data);

    await expect(provider.searchIndexFunds('spy', { limit: 1 })).resolves.toEqual([
      {
        symbol: 'SPY',
        name: 'State Street SPDR S&P 500 ETF Trust',
        exchange: 'AMEX',
      },
    ]);

    expect(client.searchBySymbol).not.toHaveBeenCalled();
  });

  it('should return normalized index fund history from fixtures', async () => {
    fixtures.readFixture.mockResolvedValue([
      {
        symbol: 'SPY',
        date: '2024-01-31',
        open: 488.62,
        high: 489.08,
        low: 482.86,
        close: 482.88,
        volume: 126011100,
      },
      {
        symbol: 'SPY',
        date: '2024-01-02',
        open: 472.16,
        high: 473.67,
        low: 470.49,
        close: 472.65,
        volume: 82488700,
      },
    ]);
    fixtures.filterHistoricalFixture.mockImplementation(
      (data: unknown[]) => data,
    );
    fixtures.filterSearchFixture.mockReturnValue([
      {
        symbol: 'SPY',
        name: 'State Street SPDR S&P 500 ETF Trust',
        exchange: 'AMEX',
      },
    ]);

    await expect(
      provider.getIndexFundHistory('spy', {
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
      {
        date: '2024-01-02',
        open: 472.16,
        high: 473.67,
        low: 470.49,
        close: 472.65,
        volume: 82488700,
      },
    ]);
  });

  it('should return an index fund detail aggregate from fixtures', async () => {
    fixtures.readFixture.mockImplementation(async (fileName: string) => {
      if (fileName.includes('etf-info')) {
        return [
          {
            symbol: 'SPY',
            name: 'State Street SPDR S&P 500 ETF Trust',
            expenseRatio: 0.0945,
            etfCompany: 'State Street',
          },
        ];
      }

      return [
        {
          symbol: 'SPY',
          date: '2024-01-31',
          open: 488.62,
          high: 489.08,
          low: 482.86,
          close: 482.88,
          volume: 126011100,
        },
        {
          symbol: 'SPY',
          date: '2024-01-02',
          open: 472.16,
          high: 473.67,
          low: 470.49,
          close: 472.65,
          volume: 82488700,
        },
      ];
    });
    fixtures.filterHistoricalFixture.mockImplementation(
      (data: unknown[]) => data,
    );
    fixtures.filterSearchFixture.mockReturnValue([
      {
        symbol: 'SPY',
        name: 'State Street SPDR S&P 500 ETF Trust',
        currency: 'USD',
        exchange: 'AMEX',
        exchangeFullName: 'New York Stock Exchange Arca',
      },
    ]);

    await expect(provider.getIndexFundDetail('spy')).resolves.toMatchObject({
      symbol: 'SPY',
      name: 'State Street SPDR S&P 500 ETF Trust',
      expenseRatio: 0.0945,
      issuer: 'State Street',
      benchmark: 'S&P 500',
      currency: 'USD',
      exchange: 'AMEX',
      priceSummary: {
        latestClose: 482.88,
        periodStartClose: 472.65,
      },
    });
  });

  it('should throw ExternalHttpError when historical data is missing', async () => {
    fixtures.readFixture.mockImplementation(async (fileName: string) => {
      if (fileName.includes('etf-info')) {
        return [
          {
            symbol: 'SPY',
            name: 'State Street SPDR S&P 500 ETF Trust',
          },
        ];
      }

      return [];
    });
    fixtures.filterHistoricalFixture.mockReturnValue([]);
    fixtures.filterSearchFixture.mockReturnValue([
      {
        symbol: 'SPY',
        name: 'State Street SPDR S&P 500 ETF Trust',
        exchange: 'AMEX',
      },
    ]);

    await expect(provider.getIndexFundDetail('SPY')).rejects.toMatchObject({
      name: 'ExternalHttpError',
      provider: FMP_PROVIDER_NAME,
      statusCode: 404,
    });
  });

  it('should call the live client when mocks are disabled', async () => {
    configMock.fmpUsesMocks = false;
    client.searchBySymbol.mockResolvedValue([
      {
        symbol: 'SPY',
        name: 'State Street SPDR S&P 500 ETF Trust',
        exchange: 'AMEX',
      },
    ]);

    await expect(provider.searchIndexFunds('spy')).resolves.toEqual([
      {
        symbol: 'SPY',
        name: 'State Street SPDR S&P 500 ETF Trust',
        exchange: 'AMEX',
      },
    ]);

    expect(client.searchBySymbol).toHaveBeenCalledWith('spy');
    configMock.fmpUsesMocks = true;
  });

  it('should throw ExternalHttpError for invalid fixture responses', async () => {
    fixtures.readFixture.mockResolvedValue({ invalid: true });
    fixtures.filterSearchFixture.mockReturnValue({ invalid: true });

    await expect(provider.searchIndexFunds('SPY')).rejects.toBeInstanceOf(
      ExternalHttpError,
    );
  });

  it('should search by name from fixtures for non-ticker queries', async () => {
    fixtures.readFixture.mockResolvedValue([
      {
        symbol: 'VTI',
        name: 'Vanguard Total Stock Market ETF',
        exchange: 'AMEX',
      },
    ]);
    fixtures.filterSearchFixture.mockImplementation((data: unknown[]) => data);

    await expect(provider.searchIndexFunds('Vanguard Total')).resolves.toEqual([
      {
        symbol: 'VTI',
        name: 'Vanguard Total Stock Market ETF',
        exchange: 'AMEX',
      },
    ]);
  });

  it('should load index fund detail from the live client when mocks are disabled', async () => {
    configMock.fmpUsesMocks = false;
    client.searchBySymbol.mockResolvedValue([
      {
        symbol: 'SPY',
        name: 'State Street SPDR S&P 500 ETF Trust',
        exchange: 'AMEX',
      },
    ]);
    client.fetchFundProfile.mockResolvedValue([
      {
        symbol: 'SPY',
        name: 'State Street SPDR S&P 500 ETF Trust',
        expenseRatio: 0.0945,
      },
    ]);
    client.fetchHistoricalData.mockResolvedValue([
      {
        date: '2024-01-31',
        open: 488.62,
        high: 489.08,
        low: 482.86,
        close: 482.88,
      },
    ]);

    await expect(provider.getIndexFundDetail('SPY')).resolves.toMatchObject({
      symbol: 'SPY',
      expenseRatio: 0.0945,
    });

    expect(client.fetchFundProfile).toHaveBeenCalledWith('SPY');
    configMock.fmpUsesMocks = true;
  });

  it('should fall back to search metadata when paid profile endpoints fail', async () => {
    configMock.fmpUsesMocks = false;
    client.searchBySymbol.mockResolvedValue([
      {
        symbol: 'SPY',
        name: 'State Street SPDR S&P 500 ETF Trust',
        exchange: 'AMEX',
        currency: 'USD',
      },
    ]);
    client.fetchFundProfile.mockRejectedValue(
      new ExternalHttpError({
        message: 'Paid endpoint unavailable',
        provider: FMP_PROVIDER_NAME,
        statusCode: 402,
      }),
    );
    client.fetchHistoricalData.mockResolvedValue([
      {
        date: '2024-01-31',
        open: 488.62,
        high: 489.08,
        low: 482.86,
        close: 482.88,
      },
    ]);

    await expect(provider.getIndexFundDetail('SPY')).resolves.toMatchObject({
      symbol: 'SPY',
      name: 'State Street SPDR S&P 500 ETF Trust',
      currency: 'USD',
    });

    configMock.fmpUsesMocks = true;
  });

  it('should rethrow non-paid profile errors from the live client', async () => {
    configMock.fmpUsesMocks = false;
    client.searchBySymbol.mockResolvedValue([
      {
        symbol: 'SPY',
        name: 'State Street SPDR S&P 500 ETF Trust',
        exchange: 'AMEX',
      },
    ]);
    client.fetchFundProfile.mockRejectedValue(
      new ExternalHttpError({
        message: 'Provider unavailable',
        provider: FMP_PROVIDER_NAME,
        statusCode: 500,
      }),
    );

    await expect(provider.getIndexFundDetail('SPY')).rejects.toMatchObject({
      statusCode: 500,
    });

    configMock.fmpUsesMocks = true;
  });

  it('should search by name through the live client for descriptive queries', async () => {
    configMock.fmpUsesMocks = false;
    client.searchByName.mockResolvedValue([
      {
        symbol: 'VTI',
        name: 'Vanguard Total Stock Market ETF',
        exchange: 'AMEX',
      },
    ]);

    await expect(provider.searchIndexFunds('Vanguard Total')).resolves.toEqual([
      {
        symbol: 'VTI',
        name: 'Vanguard Total Stock Market ETF',
        exchange: 'AMEX',
      },
    ]);

    expect(client.searchByName).toHaveBeenCalledWith('Vanguard Total');
    configMock.fmpUsesMocks = true;
  });
});
