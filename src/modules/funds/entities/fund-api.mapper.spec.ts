import { mapFundToApiFund } from './fund-api.mapper';
import type { Fund } from './fund.schema';

const fund: Fund = {
  id: '550e8400-e29b-41d4-a716-446655440000',
  symbol: 'SPY',
  isin: 'US78462F1030',
  name: 'State Street SPDR S&P 500 ETF Trust',
  issuer: 'State Street',
  provider: 'financial-modeling-prep',
  category: 'index',
  vehicle: 'etf',
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
  riskLevel: 4,
  score: 82.5,
  editorial: { badge: '', themeLabel: '', idealForBeginners: false },
  catalogVisibility: 'visible',
  createdAt: new Date('2024-01-01T00:00:00.000Z'),
  updatedAt: new Date('2024-02-01T00:00:00.000Z'),
};

describe('mapFundToApiFund', () => {
  it('should attach a Brandfetch logo URL when client ID is configured', () => {
    expect(mapFundToApiFund(fund, 'test-client-id')).toEqual({
      ...fund,
      logoUrl:
        'https://cdn.brandfetch.io/domain/ssga.com/w/64/h/64/theme/dark/fallback/404?c=test-client-id',
    });
  });

  it('should return null logoUrl when Brandfetch client ID is absent', () => {
    expect(mapFundToApiFund(fund).logoUrl).toBeNull();
  });
});
