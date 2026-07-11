import {
  buildRankingsResponse,
  enrichRankingsResponseWithReturns,
  isRankingEligible,
  normalizeBenchmarkKey,
} from './ranking.mapper';
import { RANKING_FIXTURE_FUNDS } from './ranking.fixtures';
import { rankingsQuerySchema } from './ranking.schema';

describe('rankingsQuerySchema', () => {
  it('should parse an empty query', () => {
    expect(rankingsQuerySchema.parse({})).toEqual({
      limit: 10,
      groupsLimit: 24,
    });
  });

  it('should parse benchmark and limit filters', () => {
    expect(
      rankingsQuerySchema.parse({
        benchmark: '  S&P 500  ',
        limit: '5',
      }),
    ).toEqual({
      benchmark: 'S&P 500',
      limit: 5,
      groupsLimit: 24,
    });
  });

  it('should reject an empty benchmark filter', () => {
    expect(rankingsQuerySchema.safeParse({ benchmark: '   ' }).success).toBe(
      false,
    );
  });

  it('should reject a limit outside the allowed range', () => {
    expect(rankingsQuerySchema.safeParse({ limit: '0' }).success).toBe(false);
    expect(rankingsQuerySchema.safeParse({ limit: '101' }).success).toBe(false);
  });
});

describe('isRankingEligible', () => {
  it('should require benchmark, isin, score, and ter', () => {
    expect(isRankingEligible(RANKING_FIXTURE_FUNDS[0])).toBe(true);
    expect(isRankingEligible(RANKING_FIXTURE_FUNDS[4])).toBe(false);
    expect(isRankingEligible(RANKING_FIXTURE_FUNDS[5])).toBe(false);
    expect(isRankingEligible(RANKING_FIXTURE_FUNDS[6])).toBe(false);
  });

  it('should allow quarantined funds with complete catalog metadata', () => {
    expect(
      isRankingEligible({
        ...RANKING_FIXTURE_FUNDS[0],
        catalogVisibility: 'quarantined',
      }),
    ).toBe(true);
  });

  it('should reject blocked funds even when ranking data is complete', () => {
    expect(
      isRankingEligible({
        ...RANKING_FIXTURE_FUNDS[0],
        catalogVisibility: 'blocked',
      }),
    ).toBe(false);
  });
});

describe('normalizeBenchmarkKey', () => {
  it('should normalize benchmark labels case-insensitively', () => {
    expect(normalizeBenchmarkKey('  MSCI World ')).toBe('msci world');
  });
});

describe('buildRankingsResponse', () => {
  it('should preserve meta when enriching ranked entries with returns', () => {
    const baseResponse = buildRankingsResponse(
      RANKING_FIXTURE_FUNDS,
      rankingsQuerySchema.parse({ benchmark: 'S&P 500', limit: 1 }),
    );

    const enriched = enrichRankingsResponseWithReturns(baseResponse, new Map());

    expect(enriched.meta).toEqual(baseResponse.meta);
    expect(enriched.data[0]?.funds[0]?.returns).toEqual({
      ytd: null,
      oneYear: null,
      threeYear: null,
      asOf: null,
    });
  });

  it('should group eligible funds by benchmark without mixing peer groups', () => {
    const response = buildRankingsResponse(
      RANKING_FIXTURE_FUNDS,
      rankingsQuerySchema.parse({}),
    );

    expect(response.data).toHaveLength(2);
    expect(response.meta).toMatchObject({
      totalGroups: 2,
      returnedGroups: 2,
      groupsLimit: 24,
      limit: 10,
      hasMoreGroups: false,
    });
    expect(response.data[0]).toMatchObject({
      benchmark: 'MSCI World',
      benchmarkKey: 'msci world',
      total: 2,
      funds: [
        expect.objectContaining({ symbol: 'IWDA', rank: 1, score: 80 }),
        expect.objectContaining({ symbol: 'URTH', rank: 2, score: 75 }),
      ],
    });
    expect(response.data[1]).toMatchObject({
      benchmark: 'S&P 500',
      benchmarkKey: 's&p 500',
      total: 2,
      funds: [
        expect.objectContaining({ symbol: 'IVV', rank: 1, score: 92 }),
        expect.objectContaining({ symbol: 'SPY', rank: 2, score: 88 }),
      ],
    });
  });

  it('should apply groupsLimit when no benchmark filter is provided', () => {
    const manyBenchmarkFunds = Array.from({ length: 120 }, (_, index) => ({
      ...RANKING_FIXTURE_FUNDS[0],
      id: `00000000-0000-4000-8000-${String(index).padStart(12, '0')}`,
      symbol: `SYM${index}`,
      benchmark: `Benchmark ${index}`,
    }));

    const response = buildRankingsResponse(
      manyBenchmarkFunds,
      rankingsQuerySchema.parse({ groupsLimit: 25 }),
    );

    expect(response.data).toHaveLength(25);
  });

  it('should filter to a single benchmark group', () => {
    const response = buildRankingsResponse(
      RANKING_FIXTURE_FUNDS,
      rankingsQuerySchema.parse({ benchmark: 'msci world' }),
    );

    expect(response.data).toHaveLength(1);
    expect(response.data[0]?.benchmarkKey).toBe('msci world');
    expect(response.data[0]?.funds).toHaveLength(2);
  });

  it('should return an empty list when the benchmark has no eligible funds', () => {
    const response = buildRankingsResponse(
      RANKING_FIXTURE_FUNDS,
      rankingsQuerySchema.parse({ benchmark: 'NASDAQ 100' }),
    );

    expect(response.data).toEqual([]);
  });

  it('should apply the per-group limit without changing total', () => {
    const response = buildRankingsResponse(
      RANKING_FIXTURE_FUNDS,
      rankingsQuerySchema.parse({ benchmark: 'S&P 500', limit: 1 }),
    );

    expect(response.data[0]).toMatchObject({
      total: 2,
      funds: [expect.objectContaining({ symbol: 'IVV', rank: 1 })],
    });
  });

  it('should match benchmark filters case-insensitively', () => {
    const response = buildRankingsResponse(
      RANKING_FIXTURE_FUNDS,
      rankingsQuerySchema.parse({ benchmark: 's&p 500' }),
    );

    expect(response.data).toHaveLength(1);
    expect(response.data[0]?.funds.map((fund) => fund.symbol)).toEqual([
      'IVV',
      'SPY',
    ]);
  });

  it('should break ties by symbol when scores are equal', () => {
    const tiedFunds = [
      {
        ...RANKING_FIXTURE_FUNDS[0],
        id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
        symbol: 'ZZZ',
        score: 90,
      },
      {
        ...RANKING_FIXTURE_FUNDS[1],
        id: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
        symbol: 'AAA',
        score: 90,
      },
    ];

    const response = buildRankingsResponse(
      tiedFunds,
      rankingsQuerySchema.parse({ benchmark: 'S&P 500' }),
    );

    expect(response.data[0]?.funds.map((fund) => fund.symbol)).toEqual([
      'AAA',
      'ZZZ',
    ]);
  });
});
