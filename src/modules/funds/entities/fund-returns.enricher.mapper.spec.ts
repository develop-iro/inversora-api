import type { FundApi } from './fund-api.schema';
import { enrichFundApiPayloadsWithReturns } from './fund-returns.enricher.mapper';

describe('enrichFundApiPayloadsWithReturns', () => {
  const fund: FundApi = {
    id: '550e8400-e29b-41d4-a716-446655440000',
    symbol: 'SPY',
    isin: 'US78462F1030',
    name: 'State Street SPDR S&P 500 ETF Trust',
    provider: 'financial-modeling-prep',
    category: 'index',
    vehicle: 'etf',
    currency: 'USD',
    benchmark: 'S&P 500',
    assetClass: 'Equity',
    domicile: 'US',
    investmentTheme: 'us-equity',
    issuer: 'State Street',
    metrics: {
      volatility: null,
      drawdown: null,
      ter: 0.0945,
      aum: 520_000_000_000,
      per: null,
      dividendYield: null,
      trackingError: null,
    },
    riskLevel: 4,
    score: 82.5,
    returns: {
      ytd: null,
      oneYear: null,
      threeYear: null,
      asOf: null,
    },
    editorial: {
      badge: '',
      themeLabel: '',
      idealForBeginners: false,
    },
    catalogVisibility: 'visible',
    createdAt: '2024-01-01T00:00:00.000Z',
    updatedAt: '2024-02-01T00:00:00.000Z',
  };

  it('should attach preloaded return snapshots by fund id', () => {
    const snapshots = new Map([
      [
        fund.id,
        {
          ytd: 5.5,
          oneYear: 12.1,
          threeYear: 28.4,
          asOf: '2026-06-01',
        },
      ],
    ]);

    expect(
      enrichFundApiPayloadsWithReturns([fund], [fund.id], snapshots),
    ).toEqual([
      expect.objectContaining({
        returns: {
          ytd: 5.5,
          oneYear: 12.1,
          threeYear: 28.4,
          asOf: '2026-06-01',
        },
      }),
    ]);
  });

  it('should fall back to the fund id when fundIds is shorter than funds', () => {
    const snapshots = new Map([
      [
        fund.id,
        {
          ytd: 1.2,
          oneYear: null,
          threeYear: null,
          asOf: '2026-06-01',
        },
      ],
    ]);

    expect(enrichFundApiPayloadsWithReturns([fund], [], snapshots)).toEqual([
      expect.objectContaining({
        returns: {
          ytd: 1.2,
          oneYear: null,
          threeYear: null,
          asOf: '2026-06-01',
        },
      }),
    ]);
  });
});
