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
    fetchEtfHoldings: jest.Mock;
    fetchEtfSectorWeightings: jest.Mock;
    fetchEtfCountryWeightings: jest.Mock;
    fetchEtfList: jest.Mock;
    fetchQuote: jest.Mock;
    fetchQuoteShort: jest.Mock;
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
      fetchEtfHoldings: jest.fn(),
      fetchEtfSectorWeightings: jest.fn(),
      fetchEtfCountryWeightings: jest.fn(),
      fetchEtfList: jest.fn(),
      fetchQuote: jest.fn(),
      fetchQuoteShort: jest.fn(),
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
    await expect(provider.searchIndexedProducts('   ')).resolves.toEqual([]);
    expect(fixtures.readFixture).not.toHaveBeenCalled();
  });

  it('should search index funds from fixtures and normalize results', async () => {
    fixtures.readFixture.mockResolvedValue([
      {
        symbol: 'SPY',
        name: 'State Street SPDR S&P 500 ETF Trust',
        exchange: 'AMEX',
        vehicle: 'etf',
      },
      {
        symbol: 'SPYI',
        name: 'Neos S&P 500(R) High Income ETF',
        exchange: 'CBOE',
      },
    ]);
    fixtures.filterSearchFixture.mockImplementation((data: unknown[]) => data);

    await expect(
      provider.searchIndexedProducts('spy', { limit: 1 }),
    ).resolves.toEqual([
      {
        symbol: 'SPY',
        name: 'State Street SPDR S&P 500 ETF Trust',
        exchange: 'AMEX',
        vehicle: 'etf',
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
        vehicle: 'etf',
      },
    ]);

    await expect(
      provider.getFundHistory('spy', {
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
    fixtures.readFixture.mockImplementation((fileName: string) => {
      if (fileName.includes('etf-info')) {
        return Promise.resolve([
          {
            symbol: 'SPY',
            name: 'State Street SPDR S&P 500 ETF Trust',
            expenseRatio: 0.0945,
            etfCompany: 'State Street',
          },
        ]);
      }

      return Promise.resolve([
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

    await expect(provider.getFundDetail('spy')).resolves.toMatchObject({
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

  it('should return normalized fund profile metadata without prices', async () => {
    fixtures.readFixture.mockImplementation((fileName: string) => {
      if (fileName.includes('etf-info')) {
        return Promise.resolve([
          {
            symbol: 'SPY',
            name: 'State Street SPDR S&P 500 ETF Trust',
            expenseRatio: 0.0945,
            assetsUnderManagement: 520000000000,
            etfCompany: 'State Street',
          },
        ]);
      }

      return Promise.resolve([]);
    });
    fixtures.filterSearchFixture.mockReturnValue([
      {
        symbol: 'SPY',
        name: 'State Street SPDR S&P 500 ETF Trust',
        currency: 'USD',
        exchange: 'AMEX',
        exchangeFullName: 'New York Stock Exchange Arca',
      },
    ]);

    await expect(provider.getFundProfile('spy')).resolves.toMatchObject({
      symbol: 'SPY',
      benchmark: 'S&P 500',
      expenseRatio: 0.0945,
    });
  });

  it('should return normalized index fund composition from fixtures', async () => {
    fixtures.readFixture.mockImplementation((fileName: string) => {
      if (fileName.includes('etf-holdings')) {
        return Promise.resolve([
          {
            asset: 'AAPL',
            name: 'Apple Inc.',
            weightPercentage: 7.12,
            updated: '2024-01-31',
          },
        ]);
      }

      if (fileName.includes('etf-sector-weightings')) {
        return Promise.resolve([
          {
            sector: 'Technology',
            weightPercentage: 31.5,
          },
        ]);
      }

      if (fileName.includes('etf-country-weightings')) {
        return Promise.resolve([
          {
            country: 'United States',
            weightPercentage: 97.5,
          },
        ]);
      }

      return Promise.resolve([]);
    });

    await expect(provider.getFundComposition('spy')).resolves.toEqual({
      asOf: '2024-01-31',
      holdings: [
        {
          asset: 'AAPL',
          name: 'Apple Inc.',
          weightPercentage: 7.12,
        },
      ],
      sectorWeightings: [
        {
          sector: 'Technology',
          weightPercentage: 31.5,
        },
      ],
      countryWeightings: [
        {
          country: 'United States',
          weightPercentage: 97.5,
        },
      ],
    });
  });

  it('should load index fund composition from the live client when mocks are disabled', async () => {
    configMock.fmpUsesMocks = false;
    client.fetchEtfHoldings.mockResolvedValue([
      {
        asset: 'AAPL',
        name: 'Apple Inc.',
        weightPercentage: 7.12,
        updated: '2024-01-31',
      },
    ]);
    client.fetchEtfSectorWeightings.mockResolvedValue([
      {
        sector: 'Technology',
        weightPercentage: 31.5,
      },
    ]);
    client.fetchEtfCountryWeightings.mockResolvedValue([
      {
        country: 'United States',
        weightPercentage: 97.5,
      },
    ]);

    await expect(provider.getFundComposition('spy')).resolves.toMatchObject({
      asOf: '2024-01-31',
      holdings: [
        expect.objectContaining({
          asset: 'AAPL',
        }),
      ],
    });

    expect(client.fetchEtfHoldings).toHaveBeenCalledWith('SPY');
    expect(client.fetchEtfSectorWeightings).toHaveBeenCalledWith('SPY');
    expect(client.fetchEtfCountryWeightings).toHaveBeenCalledWith('SPY');
    configMock.fmpUsesMocks = true;
  });

  it('should throw ExternalHttpError when historical data is missing', async () => {
    fixtures.readFixture.mockImplementation((fileName: string) => {
      if (fileName.includes('etf-info')) {
        return Promise.resolve([
          {
            symbol: 'SPY',
            name: 'State Street SPDR S&P 500 ETF Trust',
          },
        ]);
      }

      return Promise.resolve([]);
    });
    fixtures.filterHistoricalFixture.mockReturnValue([]);
    fixtures.filterSearchFixture.mockReturnValue([
      {
        symbol: 'SPY',
        name: 'State Street SPDR S&P 500 ETF Trust',
        exchange: 'AMEX',
        vehicle: 'etf',
      },
    ]);

    await expect(provider.getFundDetail('SPY')).rejects.toMatchObject({
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
        vehicle: 'etf',
      },
    ]);

    await expect(provider.searchIndexedProducts('spy')).resolves.toEqual([
      {
        symbol: 'SPY',
        name: 'State Street SPDR S&P 500 ETF Trust',
        exchange: 'AMEX',
        vehicle: 'etf',
      },
    ]);

    expect(client.searchBySymbol).toHaveBeenCalledWith('spy');
    configMock.fmpUsesMocks = true;
  });

  it('should throw ExternalHttpError for invalid fixture responses', async () => {
    fixtures.readFixture.mockResolvedValue({ invalid: true });
    fixtures.filterSearchFixture.mockReturnValue({ invalid: true });

    await expect(provider.searchIndexedProducts('SPY')).rejects.toBeInstanceOf(
      ExternalHttpError,
    );
  });

  it('should search by name from fixtures for non-ticker queries', async () => {
    fixtures.readFixture.mockResolvedValue([
      {
        symbol: 'VTI',
        name: 'Vanguard Total Stock Market ETF',
        exchange: 'AMEX',
        vehicle: 'etf',
      },
    ]);
    fixtures.filterSearchFixture.mockImplementation((data: unknown[]) => data);

    await expect(
      provider.searchIndexedProducts('Vanguard Total'),
    ).resolves.toEqual([
      {
        symbol: 'VTI',
        name: 'Vanguard Total Stock Market ETF',
        exchange: 'AMEX',
        vehicle: 'etf',
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
        vehicle: 'etf',
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

    await expect(provider.getFundDetail('SPY')).resolves.toMatchObject({
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

    await expect(provider.getFundDetail('SPY')).resolves.toMatchObject({
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
        vehicle: 'etf',
      },
    ]);
    client.fetchFundProfile.mockRejectedValue(
      new ExternalHttpError({
        message: 'Provider unavailable',
        provider: FMP_PROVIDER_NAME,
        statusCode: 500,
      }),
    );

    await expect(provider.getFundDetail('SPY')).rejects.toMatchObject({
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
        vehicle: 'etf',
      },
    ]);

    await expect(
      provider.searchIndexedProducts('Vanguard Total'),
    ).resolves.toEqual([
      {
        symbol: 'VTI',
        name: 'Vanguard Total Stock Market ETF',
        exchange: 'AMEX',
        vehicle: 'etf',
      },
    ]);

    expect(client.searchByName).toHaveBeenCalledWith('Vanguard Total');
    configMock.fmpUsesMocks = true;
  });

  it('should list all ETF catalog symbols from fixtures with offset and limit', async () => {
    fixtures.readFixture.mockResolvedValue([
      { symbol: 'SPY', name: 'SPDR S&P 500 ETF Trust' },
      { symbol: 'QQQ', name: 'Invesco QQQ Trust' },
      { symbol: 'ARKK', name: 'ARK Innovation ETF' },
    ]);

    await expect(
      provider.listEtfCatalogSymbols({ mode: 'all', offset: 1, limit: 1 }),
    ).resolves.toEqual(['QQQ']);
  });

  it('should filter indexed ETF catalog symbols by default', async () => {
    fixtures.readFixture.mockResolvedValue([
      { symbol: 'SPY', name: 'SPDR S&P 500 ETF Trust' },
      { symbol: 'ARKK', name: 'ARK Innovation ETF' },
    ]);

    await expect(provider.listEtfCatalogSymbols()).resolves.toEqual(['SPY']);
  });

  it('should list indexed ETF symbols through the catalog helper', async () => {
    fixtures.readFixture.mockResolvedValue([
      { symbol: 'VTI', name: 'Vanguard Total Stock Market ETF' },
    ]);

    await expect(provider.listIndexedEtfSymbols({ limit: 5 })).resolves.toEqual(
      ['VTI'],
    );
  });

  it('should fetch the live ETF list when mocks are disabled', async () => {
    configMock.fmpUsesMocks = false;
    client.fetchEtfList.mockResolvedValue([
      { symbol: 'spy', name: 'SPDR S&P 500 ETF Trust' },
    ]);

    await expect(
      provider.listEtfCatalogSymbols({ mode: 'all', limit: 10 }),
    ).resolves.toEqual(['SPY']);

    expect(client.fetchEtfList).toHaveBeenCalledTimes(1);
    configMock.fmpUsesMocks = true;
  });

  it('should return null for blank quote symbols', async () => {
    await expect(provider.getFundQuote('   ')).resolves.toBeNull();
  });

  it('should return a normalized full quote from fixtures', async () => {
    fixtures.readFixture.mockResolvedValue([
      {
        symbol: 'SPY',
        name: 'State Street SPDR S&P 500 ETF',
        price: 740.93,
        changePercentage: 1.63788,
        change: 11.94,
        volume: 11195261,
        previousClose: 728.99,
        timestamp: 1782763200,
      },
    ]);

    await expect(provider.getFundQuote('spy')).resolves.toMatchObject({
      symbol: 'SPY',
      price: 740.93,
      changePercent: 1.63788,
    });
  });

  it('should fall back to quote-short fixtures when full quote is empty', async () => {
    fixtures.readFixture.mockResolvedValueOnce([]).mockResolvedValueOnce([
      {
        symbol: 'SPY',
        price: 740.93,
        change: 11.94,
        volume: 11195261,
      },
    ]);

    await expect(provider.getFundQuote('SPY')).resolves.toMatchObject({
      symbol: 'SPY',
      price: 740.93,
    });
  });

  it('should fall back to quote-short when the full quote endpoint is paid-only', async () => {
    configMock.fmpUsesMocks = false;
    client.fetchQuote.mockRejectedValue(
      new ExternalHttpError({
        message: 'Paid endpoint unavailable',
        provider: FMP_PROVIDER_NAME,
        statusCode: 402,
      }),
    );
    client.fetchQuoteShort.mockResolvedValue([
      {
        symbol: 'SPY',
        price: 740.93,
        change: 11.94,
        volume: 11195261,
      },
    ]);

    await expect(provider.getFundQuote('SPY')).resolves.toMatchObject({
      symbol: 'SPY',
      price: 740.93,
    });

    configMock.fmpUsesMocks = true;
  });

  it('should rethrow non-paid quote errors from the live client', async () => {
    configMock.fmpUsesMocks = false;
    client.fetchQuote.mockRejectedValue(
      new ExternalHttpError({
        message: 'Provider unavailable',
        provider: FMP_PROVIDER_NAME,
        statusCode: 500,
      }),
    );

    await expect(provider.getFundQuote('SPY')).rejects.toMatchObject({
      statusCode: 500,
    });

    configMock.fmpUsesMocks = true;
  });

  it('should return null when both quote endpoints are empty', async () => {
    fixtures.readFixture.mockResolvedValue([]);

    await expect(provider.getFundQuote('SPY')).resolves.toBeNull();
  });
});
