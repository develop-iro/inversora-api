import {
  isIndexedProductSearchResult,
  isLikelyFundSearchResult,
} from './indexed-product.filters';

describe('indexed-product.filters', () => {
  it('should accept ETF names and reject corporate stock names', () => {
    expect(
      isLikelyFundSearchResult({
        symbol: 'SPY',
        name: 'State Street SPDR S&P 500 ETF Trust',
      }),
    ).toBe(true);

    expect(
      isLikelyFundSearchResult({
        symbol: 'AAPL',
        name: 'Apple Inc.',
      }),
    ).toBe(false);
  });

  it('should accept mutual fund exchange codes without ETF keywords', () => {
    expect(
      isLikelyFundSearchResult({
        symbol: 'VFIAX',
        name: 'Vanguard 500 Index Fund',
        exchangeShortName: 'MUTUAL_FUND',
      }),
    ).toBe(true);
  });

  it('should reject specialty index products', () => {
    expect(
      isIndexedProductSearchResult({
        symbol: 'SPYI',
        name: 'Neos S&P 500(R) High Income ETF',
        exchange: 'CBOE',
      }),
    ).toBe(false);
  });
});
