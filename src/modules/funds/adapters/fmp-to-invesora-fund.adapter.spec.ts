import { FmpToInvesoraFundAdapter } from './fmp-to-invesora-fund.adapter';

describe('FmpToInvesoraFundAdapter', () => {
  const adapter = new FmpToInvesoraFundAdapter();

  it('should expose the FMP data source identifier', () => {
    expect(adapter.source).toBe('financial-modeling-prep');
  });

  it('should adapt search results into unified Invesora listings', () => {
    expect(
      adapter.adaptSearchResults([
        {
          symbol: 'SPY',
          name: 'State Street SPDR S&P 500 ETF Trust',
          currency: 'USD',
          exchange: 'AMEX',
          exchangeFullName: 'New York Stock Exchange Arca',
        },
      ]),
    ).toEqual([
      {
        symbol: 'SPY',
        name: 'State Street SPDR S&P 500 ETF Trust',
        fundType: 'index',
        currency: 'USD',
        exchangeCode: 'AMEX',
        exchangeName: 'New York Stock Exchange Arca',
      },
    ]);
  });

  it('should adapt historical prices into unified Invesora price points', () => {
    expect(
      adapter.adaptPriceHistory([
        {
          date: '2024-01-31',
          open: 488.62,
          high: 489.08,
          low: 482.86,
          close: 482.88,
          volume: 126011100,
          change: -5.74,
          changePercent: -1.17,
          vwap: 485.86,
        },
      ]),
    ).toEqual([
      {
        date: '2024-01-31',
        open: 488.62,
        high: 489.08,
        low: 482.86,
        close: 482.88,
        volume: 126011100,
        dailyChange: -5.74,
        dailyChangePercent: -1.17,
        vwap: 485.86,
      },
    ]);
  });

  it('should adapt profiles into unified Invesora fund profiles', () => {
    expect(
      adapter.adaptProfile({
        symbol: 'SPY',
        name: 'State Street SPDR S&P 500 ETF Trust',
        description: 'Tracks the S&P 500 Index.',
        expenseRatio: 0.0945,
        assetsUnderManagement: 520000000000,
        nav: 482.88,
        navCurrency: 'USD',
        holdingsCount: 503,
        inceptionDate: '1993-01-22',
        issuer: 'State Street',
        benchmark: 'S&P 500',
        assetClass: 'Equity',
        domicile: 'US',
        currency: 'USD',
        exchange: 'AMEX',
        exchangeFullName: 'New York Stock Exchange Arca',
      }),
    ).toEqual({
      symbol: 'SPY',
      name: 'State Street SPDR S&P 500 ETF Trust',
      fundType: 'index',
      description: 'Tracks the S&P 500 Index.',
      issuer: 'State Street',
      benchmark: 'S&P 500',
      assetClass: 'Equity',
      domicile: 'US',
      currency: 'USD',
      exchangeCode: 'AMEX',
      exchangeName: 'New York Stock Exchange Arca',
      metrics: {
        expenseRatio: 0.0945,
        assetsUnderManagement: 520000000000,
        netAssetValue: 482.88,
        netAssetValueCurrency: 'USD',
        holdingsCount: 503,
        inceptionDate: '1993-01-22',
      },
    });
  });

  it('should adapt detail aggregates into unified Invesora fund details', () => {
    expect(
      adapter.adaptDetail({
        symbol: 'SPY',
        name: 'State Street SPDR S&P 500 ETF Trust',
        benchmark: 'S&P 500',
        issuer: 'State Street',
        expenseRatio: 0.0945,
        priceSummary: {
          latestDate: '2024-01-31',
          latestClose: 482.88,
          periodStartDate: '2024-01-02',
          periodStartClose: 472.65,
          periodReturnPercent: 2.16,
          periodHigh: 489.08,
          periodLow: 470.49,
          averageVolume: 104249900,
        },
        history: [
          {
            date: '2024-01-31',
            open: 488.62,
            high: 489.08,
            low: 482.86,
            close: 482.88,
            volume: 126011100,
          },
        ],
      }),
    ).toEqual({
      symbol: 'SPY',
      name: 'State Street SPDR S&P 500 ETF Trust',
      fundType: 'index',
      issuer: 'State Street',
      benchmark: 'S&P 500',
      metrics: {
        expenseRatio: 0.0945,
      },
      performance: {
        asOfDate: '2024-01-31',
        latestClose: 482.88,
        periodStartDate: '2024-01-02',
        periodStartClose: 472.65,
        periodReturnPercent: 2.16,
        periodHigh: 489.08,
        periodLow: 470.49,
        averageVolume: 104249900,
      },
      priceHistory: [
        {
          date: '2024-01-31',
          open: 488.62,
          high: 489.08,
          low: 482.86,
          close: 482.88,
          volume: 126011100,
        },
      ],
    });
  });

  it('should wrap listings in a unified search response envelope', () => {
    expect(
      adapter.adaptSearchResponse([
        {
          symbol: 'SPY',
          name: 'State Street SPDR S&P 500 ETF Trust',
          fundType: 'index',
        },
      ]),
    ).toEqual({
      items: [
        {
          symbol: 'SPY',
          name: 'State Street SPDR S&P 500 ETF Trust',
          fundType: 'index',
        },
      ],
      source: 'financial-modeling-prep',
    });
  });

  it('should reject invalid provider payloads', () => {
    expect(() => adapter.adaptSearchResults({ invalid: true })).toThrow();
    expect(() => adapter.adaptDetail({ symbol: 'SPY' })).toThrow();
  });
});
