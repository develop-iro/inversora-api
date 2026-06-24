import type { Fund } from './fund.schema';
import {
  computeIdealForBeginnersFromMetrics,
  hasPersistedEditorialContent,
  resolveIdealForBeginners,
} from './fund-editorial.utils';

const baseFund: Fund = {
  id: '550e8400-e29b-41d4-a716-446655440000',
  symbol: 'SPY',
  isin: 'US78462F1030',
  name: 'State Street SPDR S&P 500 ETF Trust',
  provider: 'financial-modeling-prep',
  category: 'index',
  vehicle: 'etf',
  currency: 'USD',
  benchmark: 'S&P 500',
  metrics: {
    volatility: 14.2,
    drawdown: 8.5,
    ter: 0.0945,
    aum: 520_000_000_000,
    per: null,
    dividendYield: null,
    trackingError: 0.03,
  },
  riskLevel: 4,
  score: 82,
  editorial: {
    badge: '',
    themeLabel: '',
    idealForBeginners: false,
  },
  catalogVisibility: 'visible',
  createdAt: new Date('2024-01-01T00:00:00.000Z'),
  updatedAt: new Date('2024-02-01T00:00:00.000Z'),
};

describe('fund-editorial.utils', () => {
  it('should detect persisted editorial copy', () => {
    expect(hasPersistedEditorialContent(baseFund)).toBe(false);
    expect(
      hasPersistedEditorialContent({
        ...baseFund,
        editorial: {
          badge: 'Ideal para empezar',
          themeLabel: '',
          idealForBeginners: true,
        },
      }),
    ).toBe(true);
  });

  it('should compute beginner suitability from score, risk, and TER', () => {
    expect(computeIdealForBeginnersFromMetrics(baseFund)).toBe(true);
    expect(
      computeIdealForBeginnersFromMetrics({
        ...baseFund,
        score: 60,
      }),
    ).toBe(false);
    expect(
      computeIdealForBeginnersFromMetrics({
        ...baseFund,
        riskLevel: 7,
      }),
    ).toBe(false);
  });

  it('should prefer persisted editorial boolean when copy exists', () => {
    expect(
      resolveIdealForBeginners({
        ...baseFund,
        editorial: {
          badge: 'ESG',
          themeLabel: 'Europa',
          idealForBeginners: false,
        },
      }),
    ).toBe(false);
  });

  it('should fall back to metric rules when editorial copy is empty', () => {
    expect(resolveIdealForBeginners(baseFund)).toBe(true);
  });
});
