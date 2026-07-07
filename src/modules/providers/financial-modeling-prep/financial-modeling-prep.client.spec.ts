import { Test, TestingModule } from '@nestjs/testing';
import { AppConfigService } from '../../../shared/config/config.service';
import { ExternalHttpError } from '../../../shared/http/external-http.error';
import { HttpClientService } from '../../../shared/http/http-client.service';
import { FinancialModelingPrepClient } from './financial-modeling-prep.client';
import { FMP_DEFAULT_BASE_URL } from './financial-modeling-prep.constants';
import { FinancialModelingPrepFixtureService } from './financial-modeling-prep.fixture.service';

describe('FinancialModelingPrepClient', () => {
  let client: FinancialModelingPrepClient;
  let httpClient: { get: jest.Mock };
  let config: { fmpBaseUrl: string | null; fmpApiKey: string };
  let fixtures: { saveFixtureIfEnabled: jest.Mock };

  const etfInfoPayload = [
    {
      symbol: 'SPY',
      name: 'State Street SPDR S&P 500 ETF Trust',
      expenseRatio: 0.0945,
    },
  ];

  beforeEach(async () => {
    httpClient = {
      get: jest.fn(),
    };
    config = {
      fmpBaseUrl: null,
      fmpApiKey: 'test-api-key',
    };
    fixtures = {
      saveFixtureIfEnabled: jest.fn().mockResolvedValue(undefined),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FinancialModelingPrepClient,
        {
          provide: HttpClientService,
          useValue: httpClient,
        },
        {
          provide: AppConfigService,
          useValue: config,
        },
        {
          provide: FinancialModelingPrepFixtureService,
          useValue: fixtures,
        },
      ],
    }).compile();

    client = module.get(FinancialModelingPrepClient);
  });

  it('should search by symbol and persist fixtures when enabled', async () => {
    const payload = [{ symbol: 'SPY', name: 'SPDR S&P 500 ETF Trust' }];
    httpClient.get.mockResolvedValue({ data: payload });

    await expect(client.searchBySymbol('SPY')).resolves.toEqual(payload);
    expect(httpClient.get).toHaveBeenCalledWith(
      `${FMP_DEFAULT_BASE_URL}/stable/search-symbol`,
      {
        provider: 'financial-modeling-prep',
        params: {
          query: 'SPY',
          apikey: 'test-api-key',
        },
      },
    );
    expect(fixtures.saveFixtureIfEnabled).toHaveBeenCalled();
  });

  it('should search by name using the configured base URL', async () => {
    config.fmpBaseUrl = 'https://custom.example.com/';
    const payload = [
      { symbol: 'VTI', name: 'Vanguard Total Stock Market ETF' },
    ];
    httpClient.get.mockResolvedValue({ data: payload });

    await expect(client.searchByName('Vanguard')).resolves.toEqual(payload);
    expect(httpClient.get).toHaveBeenCalledTimes(1);
    expect(httpClient.get).toHaveBeenCalledWith(
      'https://custom.example.com/stable/search-name',
      expect.any(Object),
    );

    const requestCalls = httpClient.get.mock.calls as Array<
      [string, { params: { query: string; apikey: string } }]
    >;
    const requestOptions = requestCalls[0]?.[1];

    expect(requestOptions.params).toEqual({
      query: 'Vanguard',
      apikey: 'test-api-key',
    });
  });

  it('should fetch ETF holdings', async () => {
    const payload = [
      {
        asset: 'AAPL',
        name: 'Apple Inc.',
        weightPercentage: 7.12,
      },
    ];
    httpClient.get.mockResolvedValue({ data: payload });

    await expect(client.fetchEtfHoldings('SPY')).resolves.toEqual(payload);
    expect(httpClient.get).toHaveBeenCalledWith(
      `${FMP_DEFAULT_BASE_URL}/stable/etf/holdings`,
      expect.objectContaining({
        params: {
          symbol: 'SPY',
          apikey: 'test-api-key',
        },
      }),
    );
  });

  it('should fetch ETF sector and country weightings', async () => {
    httpClient.get
      .mockResolvedValueOnce({
        data: [{ sector: 'Technology', weightPercentage: 31.5 }],
      })
      .mockResolvedValueOnce({
        data: [{ country: 'United States', weightPercentage: 97.5 }],
      });

    await expect(client.fetchEtfSectorWeightings('SPY')).resolves.toEqual([
      { sector: 'Technology', weightPercentage: 31.5 },
    ]);
    await expect(client.fetchEtfCountryWeightings('SPY')).resolves.toEqual([
      { country: 'United States', weightPercentage: 97.5 },
    ]);
  });

  it('should fetch fund profiles', async () => {
    httpClient.get.mockResolvedValue({ data: etfInfoPayload });

    await expect(client.fetchFundProfile('SPY')).resolves.toEqual(
      etfInfoPayload,
    );
  });

  it('should fetch historical data with optional date filters', async () => {
    const payload = [
      {
        date: '2024-01-31',
        open: 480,
        high: 485,
        low: 478,
        close: 482,
      },
    ];
    httpClient.get.mockResolvedValue({ data: payload });

    await expect(
      client.fetchHistoricalData('SPY', {
        from: '2024-01-01',
        to: '2024-01-31',
      }),
    ).resolves.toEqual(payload);

    expect(httpClient.get).toHaveBeenCalledWith(
      `${FMP_DEFAULT_BASE_URL}/stable/historical-price-eod/full`,
      expect.objectContaining({
        params: {
          symbol: 'SPY',
          from: '2024-01-01',
          to: '2024-01-31',
          apikey: 'test-api-key',
        },
      }),
    );
  });

  it('should reject invalid provider payloads', async () => {
    httpClient.get.mockResolvedValue({ data: [{ invalid: true }] });

    await expect(client.fetchFundProfile('SPY')).rejects.toBeInstanceOf(
      ExternalHttpError,
    );
  });

  it('should fetch the ETF catalog list from FMP', async () => {
    const payload = [
      { symbol: 'SPY', name: 'SPDR S&P 500 ETF Trust' },
      { symbol: 'QQQ', name: 'Invesco QQQ Trust' },
    ];
    httpClient.get.mockResolvedValue({ data: payload });

    await expect(client.fetchEtfList()).resolves.toEqual(payload);
    expect(httpClient.get).toHaveBeenCalledWith(
      `${FMP_DEFAULT_BASE_URL}/stable/etf-list`,
      {
        provider: 'financial-modeling-prep',
        params: {
          apikey: 'test-api-key',
        },
      },
    );
  });

  it('should fetch full and short quote payloads for a symbol', async () => {
    const fullQuote = [
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
    ];
    const shortQuote = [
      {
        symbol: 'SPY',
        price: 740.93,
        change: 11.94,
        volume: 11195261,
      },
    ];
    httpClient.get
      .mockResolvedValueOnce({ data: fullQuote })
      .mockResolvedValueOnce({ data: shortQuote });

    await expect(client.fetchQuote('SPY')).resolves.toEqual(fullQuote);
    await expect(client.fetchQuoteShort('SPY')).resolves.toEqual(shortQuote);

    expect(httpClient.get).toHaveBeenNthCalledWith(
      1,
      `${FMP_DEFAULT_BASE_URL}/stable/quote`,
      expect.objectContaining({
        params: {
          symbol: 'SPY',
          apikey: 'test-api-key',
        },
      }),
    );
    expect(httpClient.get).toHaveBeenNthCalledWith(
      2,
      `${FMP_DEFAULT_BASE_URL}/stable/quote-short`,
      expect.objectContaining({
        params: {
          symbol: 'SPY',
          apikey: 'test-api-key',
        },
      }),
    );
  });
});
