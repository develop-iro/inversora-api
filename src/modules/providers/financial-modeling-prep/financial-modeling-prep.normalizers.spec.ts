import {
  buildProviderFundDetail,
  buildProviderFundPriceSummary,
  buildProviderFundComposition,
  detectWeightScale,
  normalizeProviderFundCountryWeightings,
  resolveProviderFundCompositionAsOf,
  normalizeProviderFundHistoricalPrices,
  normalizeProviderFundHoldings,
  normalizeProviderFundProfile,
  normalizeProviderFundSearchResults,
  normalizeProviderFundSectorWeightings,
} from './financial-modeling-prep.normalizers';
import { isIndexedProductSearchResult } from './indexed-product.filters';

describe('FinancialModelingPrep normalizers', () => {
  it('should identify index funds and exclude specialty products', () => {
    expect(
      isIndexedProductSearchResult({
        symbol: 'SPY',
        name: 'State Street SPDR S&P 500 ETF Trust',
        exchange: 'AMEX',
        vehicle: 'etf',
      }),
    ).toBe(true);

    expect(
      isIndexedProductSearchResult({
        symbol: 'SPYI',
        name: 'Neos S&P 500(R) High Income ETF',
        exchange: 'CBOE',
      }),
    ).toBe(false);

    expect(
      isIndexedProductSearchResult({
        symbol: 'AAPL',
        name: 'Apple Inc.',
        exchange: 'NASDAQ',
      }),
    ).toBe(false);
  });

  it('should normalize index fund search results', () => {
    expect(
      normalizeProviderFundSearchResults([
        {
          symbol: 'SPY',
          name: 'State Street SPDR S&P 500 ETF Trust',
          currency: 'USD',
          exchangeFullName: 'New York Stock Exchange Arca',
          exchange: 'AMEX',
          vehicle: 'etf',
        },
        {
          symbol: 'SPYI',
          name: 'Neos S&P 500(R) High Income ETF',
          exchange: 'CBOE',
        },
      ]),
    ).toEqual([
      {
        symbol: 'SPY',
        name: 'State Street SPDR S&P 500 ETF Trust',
        vehicle: 'etf',
        currency: 'USD',
        exchange: 'AMEX',
        exchangeFullName: 'New York Stock Exchange Arca',
      },
    ]);
  });

  it('should normalize index fund profiles with benchmark metadata', () => {
    expect(
      normalizeProviderFundProfile(
        {
          symbol: 'SPY',
          name: 'State Street SPDR S&P 500 ETF Trust',
          expenseRatio: 0.0945,
          assetsUnderManagement: 520000000000,
          etfCompany: 'State Street',
        },
        {
          symbol: 'SPY',
          name: 'State Street SPDR S&P 500 ETF Trust',
          currency: 'USD',
          exchangeFullName: 'New York Stock Exchange Arca',
          exchange: 'AMEX',
        },
      ),
    ).toMatchObject({
      symbol: 'SPY',
      name: 'State Street SPDR S&P 500 ETF Trust',
      vehicle: 'etf',
      expenseRatio: 0.0945,
      assetsUnderManagement: 520000000000,
      issuer: 'State Street',
      currency: 'USD',
      exchange: 'AMEX',
      exchangeFullName: 'New York Stock Exchange Arca',
      benchmark: 'S&P 500',
    });
  });

  it('should build historical summaries and index fund detail aggregates', () => {
    const history = normalizeProviderFundHistoricalPrices([
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

    const summary = buildProviderFundPriceSummary(history);

    expect(summary).toEqual({
      latestDate: '2024-01-31',
      latestClose: 482.88,
      periodStartDate: '2024-01-02',
      periodStartClose: 472.65,
      periodReturnPercent: summary.periodReturnPercent,
      periodHigh: 489.08,
      periodLow: 470.49,
      averageVolume: 104249900,
    });
    expect(summary.periodReturnPercent).toBeCloseTo(2.1644, 3);

    expect(
      buildProviderFundDetail(
        {
          symbol: 'SPY',
          name: 'State Street SPDR S&P 500 ETF Trust',
          vehicle: 'etf',
          benchmark: 'S&P 500',
        },
        history,
        true,
      ),
    ).toMatchObject({
      symbol: 'SPY',
      benchmark: 'S&P 500',
      priceSummary: {
        latestClose: 482.88,
      },
      history,
    });
  });

  it('should normalize sector and country weightings', () => {
    expect(
      normalizeProviderFundSectorWeightings([
        {
          sector: 'Healthcare',
          weightPercentage: 12.8,
        },
        {
          sector: 'Technology',
          weight: 0.315,
        },
      ]),
    ).toEqual([
      {
        sector: 'Technology',
        weightPercentage: 31.5,
      },
      {
        sector: 'Healthcare',
        weightPercentage: 12.8,
      },
    ]);

    expect(
      normalizeProviderFundCountryWeightings([
        {
          country: 'United States',
          weightPercentage: 97.5,
        },
        {
          country: 'Ireland',
          weight: 0.012,
        },
      ]),
    ).toEqual([
      {
        country: 'United States',
        weightPercentage: 97.5,
      },
      {
        country: 'Ireland',
        weightPercentage: 1.2,
      },
    ]);

    expect(
      normalizeProviderFundCountryWeightings([
        {
          country: 'United States',
          weightPercentage: 97.5,
        },
        {
          country: 'Ireland',
          weightPercentage: 1.2,
        },
        {
          country: 'United Kingdom',
          weightPercentage: 0.8,
        },
      ]),
    ).toEqual([
      {
        country: 'United States',
        weightPercentage: 97.5,
      },
      {
        country: 'Ireland',
        weightPercentage: 1.2,
      },
      {
        country: 'United Kingdom',
        weightPercentage: 0.8,
      },
    ]);
  });

  it('should detect weight scale and normalize weight-only fraction batches', () => {
    expect(detectWeightScale([])).toBe('percent');
    expect(detectWeightScale([0.975, 0.012, 0.008])).toBe('fraction');
    expect(detectWeightScale([97.5, 1.2])).toBe('percent');

    expect(
      normalizeProviderFundSectorWeightings([
        {
          sector: 'Technology',
          weight: 0.315,
        },
        {
          sector: 'Healthcare',
          weight: 0.685,
        },
      ]),
    ).toEqual([
      {
        sector: 'Healthcare',
        weightPercentage: 68.5,
      },
      {
        sector: 'Technology',
        weightPercentage: 31.5,
      },
    ]);

    expect(
      normalizeProviderFundSectorWeightings([
        {
          sector: 'Healthcare',
          weight: 31.5,
        },
      ]),
    ).toEqual([
      {
        sector: 'Healthcare',
        weightPercentage: 31.5,
      },
    ]);
  });

  it('should ignore invalid sector and country weightings', () => {
    expect(
      normalizeProviderFundSectorWeightings([
        {
          sector: 'Cash',
          weightPercentage: 0,
        },
        {
          sector: 'Unknown',
        },
        {
          sector: 'Technology',
          weightPercentage: Number.NaN,
        },
        {
          sector: 'Healthcare',
          weightPercentage: 12.8,
        },
      ]),
    ).toEqual([
      {
        sector: 'Healthcare',
        weightPercentage: 12.8,
      },
    ]);

    expect(
      normalizeProviderFundCountryWeightings([
        {
          country: 'Ireland',
          weightPercentage: -1,
        },
        {
          country: 'United States',
          weightPercentage: 97.5,
        },
      ]),
    ).toEqual([
      {
        country: 'United States',
        weightPercentage: 97.5,
      },
    ]);
  });

  it('should fall back to today when holdings have no update date', () => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2024-06-08T12:00:00.000Z'));

    expect(resolveProviderFundCompositionAsOf([])).toBe('2024-06-08');

    jest.useRealTimers();
  });

  it('should build a normalized composition snapshot', () => {
    expect(
      buildProviderFundComposition(
        [
          {
            asset: 'AAPL',
            name: 'Apple Inc.',
            weightPercentage: 7.12,
            updated: '2024-01-31',
          },
        ],
        [
          {
            sector: 'Technology',
            weightPercentage: 31.5,
          },
        ],
        [
          {
            country: 'United States',
            weightPercentage: 97.5,
          },
        ],
      ),
    ).toEqual({
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

  it('should normalize fund holdings sorted by weight descending', () => {
    expect(
      normalizeProviderFundHoldings([
        {
          asset: 'MSFT',
          name: 'Microsoft Corporation',
          weightPercentage: 6.8,
        },
        {
          asset: 'AAPL',
          name: 'Apple Inc.',
          weightPercentage: 7.12,
        },
        {
          name: '',
          weightPercentage: 1,
        },
      ]),
    ).toEqual([
      {
        asset: 'AAPL',
        name: 'Apple Inc.',
        weightPercentage: 7.12,
      },
      {
        asset: 'MSFT',
        name: 'Microsoft Corporation',
        weightPercentage: 6.8,
      },
    ]);
  });

  it('should fall back to search metadata when profile fields are missing', () => {
    expect(
      normalizeProviderFundProfile(
        {
          symbol: 'SPY',
        },
        {
          symbol: 'SPY',
          name: 'State Street SPDR S&P 500 ETF Trust',
          currency: 'USD',
          exchangeFullName: 'New York Stock Exchange Arca',
        },
      ),
    ).toMatchObject({
      symbol: 'SPY',
      name: 'State Street SPDR S&P 500 ETF Trust',
      currency: 'USD',
      exchangeFullName: 'New York Stock Exchange Arca',
    });
  });

  it('should normalize holdings that only provide an asset ticker', () => {
    expect(
      normalizeProviderFundHoldings([
        {
          asset: 'AAPL',
          weightPercentage: 7.12,
        },
      ]),
    ).toEqual([
      {
        asset: 'AAPL',
        name: 'AAPL',
        weightPercentage: 7.12,
      },
    ]);
  });

  it('should reject empty historical series when building summaries', () => {
    expect(() => buildProviderFundPriceSummary([])).toThrow(
      'Cannot build price summary from an empty historical series',
    );
  });

  it('should handle zero starting closes and omit optional history', () => {
    const history = normalizeProviderFundHistoricalPrices([
      {
        date: '2024-01-31',
        open: 0,
        high: 0,
        low: 0,
        close: 10,
      },
      {
        date: '2024-01-01',
        open: 0,
        high: 0,
        low: 0,
        close: 0,
      },
    ]);

    expect(buildProviderFundPriceSummary(history).periodReturnPercent).toBe(0);
    expect(
      buildProviderFundDetail(
        {
          symbol: 'SPY',
          name: 'State Street SPDR S&P 500 ETF Trust',
          vehicle: 'etf',
        },
        history,
      ).history,
    ).toBeUndefined();
  });
});
