import type { Fund } from './fund.schema';
import {
  buildAutomaticCatalogVisibilityReason,
  collectCatalogDataQualityIssues,
  isCatalogDataComplete,
  resolveAutomaticCatalogVisibility,
} from './catalog-visibility.utils';

const completeFund: Fund = {
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
  catalogVisibility: 'visible',
  editorial: { badge: '', themeLabel: '', idealForBeginners: false },
  createdAt: new Date('2024-01-01T00:00:00.000Z'),
  updatedAt: new Date('2024-02-01T00:00:00.000Z'),
};

describe('catalog-visibility.utils', () => {
  it('should detect missing catalog data fields', () => {
    expect(
      collectCatalogDataQualityIssues({
        ...completeFund,
        isin: null,
        benchmark: null,
        score: null,
      }),
    ).toEqual(['missing-isin', 'missing-benchmark']);

    expect(
      collectCatalogDataQualityIssues({
        ...completeFund,
        metrics: { ...completeFund.metrics, ter: null },
      }),
    ).toEqual(['missing-ter']);
  });

  it('should mark complete visible funds as catalog-ready', () => {
    expect(isCatalogDataComplete(completeFund)).toBe(true);
    expect(resolveAutomaticCatalogVisibility(completeFund)).toBe('visible');
    expect(
      resolveAutomaticCatalogVisibility({
        ...completeFund,
        score: null,
      }),
    ).toBe('visible');
  });

  it('should auto-quarantine visible funds with incomplete data', () => {
    const incompleteFund = {
      ...completeFund,
      metrics: { ...completeFund.metrics, ter: null },
    };

    expect(resolveAutomaticCatalogVisibility(incompleteFund)).toBe(
      'quarantined',
    );
    expect(
      buildAutomaticCatalogVisibilityReason(incompleteFund, 'quarantined'),
    ).toContain('missing-ter');
  });

  it('should detect a blank fund name as missing catalog data', () => {
    expect(
      collectCatalogDataQualityIssues({
        ...completeFund,
        name: '   ',
      }),
    ).toContain('missing-name');
  });

  it('should build a visible-state automatic reason', () => {
    expect(
      buildAutomaticCatalogVisibilityReason(completeFund, 'visible'),
    ).toContain('requirements satisfied');
  });

  it('should never auto-change blocked funds', () => {
    expect(
      resolveAutomaticCatalogVisibility({
        ...completeFund,
        catalogVisibility: 'blocked',
      }),
    ).toBe('blocked');
  });

  it('should promote quarantined funds when catalog data becomes complete', () => {
    expect(
      resolveAutomaticCatalogVisibility({
        ...completeFund,
        catalogVisibility: 'quarantined',
      }),
    ).toBe('visible');
  });

  it('should keep quarantined funds quarantined when data is still incomplete', () => {
    expect(
      resolveAutomaticCatalogVisibility({
        ...completeFund,
        catalogVisibility: 'quarantined',
        metrics: { ...completeFund.metrics, ter: null },
      }),
    ).toBe('quarantined');
  });
});
