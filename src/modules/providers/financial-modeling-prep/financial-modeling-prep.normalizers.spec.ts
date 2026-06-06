import {
  buildIndexFundDetail,
  buildIndexFundPriceSummary,
  normalizeIndexFundHistoricalPrices,
  normalizeIndexFundHoldings,
  normalizeIndexFundProfile,
  normalizeIndexFundSearchResults,
} from './financial-modeling-prep.normalizers';
import { isIndexFundSearchResult } from './index-fund.filters';

describe('FinancialModelingPrep normalizers', () => {
  it('should identify index funds and exclude specialty products', () => {
    expect(
      isIndexFundSearchResult({
        symbol: 'SPY',
        name: 'State Street SPDR S&P 500 ETF Trust',
        exchange: 'AMEX',
      }),
    ).toBe(true);

    expect(
      isIndexFundSearchResult({
        symbol: 'SPYI',
        name: 'Neos S&P 500(R) High Income ETF',
        exchange: 'CBOE',
      }),
    ).toBe(false);

    expect(
      isIndexFundSearchResult({
        symbol: 'AAPL',
        name: 'Apple Inc.',
        exchange: 'NASDAQ',
      }),
    ).toBe(false);
  });

  it('should normalize index fund search results', () => {
    expect(
      normalizeIndexFundSearchResults([
        {
          symbol: 'SPY',
          name: 'State Street SPDR S&P 500 ETF Trust',
          currency: 'USD',
          exchangeFullName: 'New York Stock Exchange Arca',
          exchange: 'AMEX',
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
        currency: 'USD',
        exchange: 'AMEX',
        exchangeFullName: 'New York Stock Exchange Arca',
      },
    ]);
  });

  it('should normalize index fund profiles with benchmark metadata', () => {
    expect(
      normalizeIndexFundProfile(
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
    ).toEqual({
      symbol: 'SPY',
      name: 'State Street SPDR S&P 500 ETF Trust',
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
    const history = normalizeIndexFundHistoricalPrices([
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

    expect(buildIndexFundPriceSummary(history)).toEqual({
      latestDate: '2024-01-31',
      latestClose: 482.88,
      periodStartDate: '2024-01-02',
      periodStartClose: 472.65,
      periodReturnPercent: expect.closeTo(2.1644, 3),
      periodHigh: 489.08,
      periodLow: 470.49,
      averageVolume: 104249900,
    });

    expect(
      buildIndexFundDetail(
        {
          symbol: 'SPY',
          name: 'State Street SPDR S&P 500 ETF Trust',
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

  it('should normalize fund holdings sorted by weight descending', () => {
    expect(
      normalizeIndexFundHoldings([
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
});
