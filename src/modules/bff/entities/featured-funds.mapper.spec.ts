import {
  buildFeaturedFundsResponse,
  filterFeaturedFunds,
  mapFundToFeaturedFund,
} from './featured-funds.mapper';
import { featuredFundsResponseSchema } from './featured-funds.schema';
import {
  buildQuarterMetadata,
  formatQuarterKey,
  parseQuarterKey,
  resolveQuarterFromQuery,
} from './quarter-metadata.utils';
import type { Fund } from '../../funds/entities/fund.schema';
import featuredFixture from '../fixtures/featured-funds-q2-2026.fixture.json';

const fund: Fund = {
  id: '550e8400-e29b-41d4-a716-446655440000',
  symbol: 'SPY',
  isin: 'US78462F1030',
  name: 'State Street SPDR S&P 500 ETF Trust',
  provider: 'financial-modeling-prep',
  category: 'index',
  vehicle: 'etf',
  currency: 'USD',
  benchmark: 'S&P 500',
  issuer: null,
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
  catalogVisibility: 'visible',
  editorial: { badge: '', themeLabel: '', idealForBeginners: false },
  createdAt: new Date('2024-01-01T00:00:00.000Z'),
  updatedAt: new Date('2024-02-01T00:00:00.000Z'),
};

describe('quarter-metadata.utils', () => {
  it('should parse canonical quarter keys', () => {
    expect(parseQuarterKey('2026-Q2')).toEqual({ year: 2026, quarter: 2 });
  });

  it('should build quarter metadata with ISO period boundaries', () => {
    expect(buildQuarterMetadata({ year: 2026, quarter: 2 })).toEqual({
      year: 2026,
      quarter: 2,
      quarterKey: '2026-Q2',
      quarterTag: 'Q2 2026',
      periodStart: '2026-04-01',
      periodEnd: '2026-06-30',
    });
  });

  it('should accept display quarter format in queries', () => {
    expect(resolveQuarterFromQuery('Q2 2026').quarterKey).toBe('2026-Q2');
  });

  it('should default to the current quarter when omitted', () => {
    const resolved = resolveQuarterFromQuery();
    expect(resolved.quarterKey).toMatch(/^\d{4}-Q[1-4]$/);
  });

  it('should format quarter keys', () => {
    expect(formatQuarterKey(2026, 1)).toBe('2026-Q1');
  });
});

describe('featured-funds.mapper', () => {
  const quarter = buildQuarterMetadata({ year: 2026, quarter: 2 });

  it('should map a fund and editorial copy to FeaturedFund', () => {
    const mapped = mapFundToFeaturedFund({
      fund,
      quarter,
      editorial: {
        isin: 'US78462F1030',
        themeLabel: 'Referencia S&P 500',
        badge: 'Núcleo USA',
        benefitSummary:
          'Replica el índice S&P 500 con alta liquidez y costes competitivos.',
        featuredReason: 'Referencia global + datos verificados en catálogo',
      },
    });

    expect(mapped.isFeatured).toBe(true);
    expect(mapped.efficiencyScore).toBe(82);
    expect(mapped.quarterTag).toBe('Q2 2026');
  });

  it('should apply benchmark and mercado filters', () => {
    const mapped = mapFundToFeaturedFund({
      fund,
      quarter,
      editorial: {
        isin: 'US78462F1030',
        themeLabel: 'Referencia S&P 500',
        badge: 'Núcleo USA',
        benefitSummary: 'Summary',
        featuredReason: 'Reason',
      },
    });

    expect(
      filterFeaturedFunds([mapped], { benchmark: 's&p 500' }),
    ).toHaveLength(1);
    expect(filterFeaturedFunds([mapped], { mercado: 'usa' })).toHaveLength(1);
    expect(filterFeaturedFunds([mapped], { mercado: 'us' })).toHaveLength(1);
    expect(filterFeaturedFunds([mapped], { mercado: 'europa' })).toHaveLength(
      0,
    );
    expect(filterFeaturedFunds([mapped], { mercado: 'europe' })).toHaveLength(
      0,
    );
    expect(filterFeaturedFunds([mapped], { limit: 1 })).toHaveLength(1);
  });

  it('should support global and free-text mercado filters', () => {
    const globalFund = mapFundToFeaturedFund({
      fund: {
        ...fund,
        name: 'Global Index Fund',
        benchmark: 'MSCI World',
      },
      quarter,
      editorial: {
        isin: 'IE00B4L5Y983',
        themeLabel: 'Multisector global',
        badge: 'Global',
        benefitSummary: 'Summary',
        featuredReason: 'Reason',
      },
    });

    expect(
      filterFeaturedFunds([globalFund], { mercado: 'global' }),
    ).toHaveLength(1);
    expect(
      filterFeaturedFunds([globalFund], { mercado: 'multisector' }),
    ).toHaveLength(1);
  });

  it('should match europa mercado filters', () => {
    const europeFund = mapFundToFeaturedFund({
      fund: {
        ...fund,
        name: 'Europe Quality Fund',
        benchmark: 'STOXX Europe',
      },
      quarter,
      editorial: {
        isin: 'LU1781541179',
        themeLabel: 'Europa ESG',
        badge: 'ESG',
        benefitSummary: 'Summary',
        featuredReason: 'Reason',
      },
    });

    expect(
      filterFeaturedFunds([europeFund], { mercado: 'europa' }),
    ).toHaveLength(1);
  });

  it('should default missing score and TER values when mapping funds', () => {
    const mapped = mapFundToFeaturedFund({
      fund: {
        ...fund,
        score: null,
        metrics: {
          ...fund.metrics,
          ter: null,
        },
      },
      quarter,
      editorial: {
        isin: 'US78462F1030',
        themeLabel: 'Referencia S&P 500',
        badge: 'Núcleo USA',
        benefitSummary: 'Summary',
        featuredReason: 'Reason',
      },
    });

    expect(mapped.efficiencyScore).toBe(0);
    expect(mapped.terPercent).toBe(0);
    expect(mapped.idealForBeginners).toBe(false);
  });

  it('should prefer an explicit live efficiency score over the persisted score', () => {
    const mapped = mapFundToFeaturedFund({
      fund,
      quarter,
      efficiencyScore: 47,
      editorial: {
        isin: 'US78462F1030',
        themeLabel: 'Referencia S&P 500',
        badge: 'Núcleo USA',
        benefitSummary: 'Summary',
        featuredReason: 'Reason',
      },
    });

    expect(mapped.efficiencyScore).toBe(47);
  });

  it('should validate the example fixture shape', () => {
    const parsed = featuredFundsResponseSchema.parse(featuredFixture);

    expect(parsed.quarter).toBe('2026-Q2');
    expect(parsed.data[0]?.isin).toBe('US78462F1030');
  });

  it('should build a response envelope', () => {
    const response = buildFeaturedFundsResponse(quarter, [
      mapFundToFeaturedFund({
        fund,
        quarter,
        editorial: {
          isin: 'US78462F1030',
          themeLabel: 'Referencia S&P 500',
          badge: 'Núcleo USA',
          benefitSummary: 'Summary',
          featuredReason: 'Reason',
        },
      }),
    ]);

    expect(featuredFundsResponseSchema.parse(response).data).toHaveLength(1);
  });
});
