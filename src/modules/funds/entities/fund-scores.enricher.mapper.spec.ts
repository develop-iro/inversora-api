import { enrichFundApiPayloadsWithScores } from './fund-scores.enricher.mapper';
import type { FundApi } from './fund-api.schema';

const baseFund = {
  id: 'fund-a',
  symbol: 'AAA',
  isin: 'US0000000001',
  name: 'Fund A',
  issuer: null,
  logoUrl: null,
  provider: 'financial-modeling-prep' as const,
  category: 'index' as const,
  vehicle: 'etf' as const,
  currency: 'USD',
  benchmark: 'S&P 500',
  assetClass: null,
  domicile: null,
  investmentTheme: null,
  metrics: {
    volatility: null,
    drawdown: null,
    ter: 0.1,
    aum: null,
    per: null,
    dividendYield: null,
    trackingError: null,
  },
  riskLevel: 4,
  editorial: { badge: '', themeLabel: '', idealForBeginners: false },
  catalogVisibility: 'visible' as const,
  createdAt: new Date('2024-01-01T00:00:00.000Z'),
  updatedAt: new Date('2024-02-01T00:00:00.000Z'),
  returns: {
    ytd: null,
    oneYear: null,
    threeYear: null,
    asOf: null,
  },
};

function buildFundApi(overrides: Partial<FundApi> = {}): FundApi {
  return {
    ...baseFund,
    score: 82,
    ...overrides,
  };
}

describe('enrichFundApiPayloadsWithScores', () => {
  it('should fill only funds with missing persisted scores', () => {
    const funds = [
      buildFundApi({ id: 'fund-a', score: 82 }),
      buildFundApi({ id: 'fund-b', score: null }),
    ];

    const enriched = enrichFundApiPayloadsWithScores(
      funds,
      ['fund-a', 'fund-b'],
      new Map([
        ['fund-a', 91],
        ['fund-b', 74],
      ]),
    );

    expect(enriched[0]?.score).toBe(82);
    expect(enriched[1]?.score).toBe(74);
  });

  it('should leave funds unchanged when no live score is available', () => {
    const funds = [buildFundApi({ id: 'fund-a', score: null })];

    const enriched = enrichFundApiPayloadsWithScores(
      funds,
      ['fund-a'],
      new Map(),
    );

    expect(enriched[0]?.score).toBeNull();
  });
});
