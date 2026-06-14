import {
  buildRankingsResponse,
  isRankingEligible,
  normalizeBenchmarkKey,
} from './ranking.mapper';
import { RANKING_FIXTURE_FUNDS } from './ranking.fixtures';
import { rankingsQuerySchema } from './ranking.schema';

describe('rankingsQuerySchema', () => {
  it('should parse an empty query', () => {
    expect(rankingsQuerySchema.parse({})).toEqual({});
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
});

describe('normalizeBenchmarkKey', () => {
  it('should normalize benchmark labels case-insensitively', () => {
    expect(normalizeBenchmarkKey('  MSCI World ')).toBe('msci world');
  });
});

describe('buildRankingsResponse', () => {
  it('should group eligible funds by benchmark without mixing peer groups', () => {
    const response = buildRankingsResponse(RANKING_FIXTURE_FUNDS, {});

    expect(response.data).toHaveLength(2);
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

  it('should filter to a single benchmark group', () => {
    const response = buildRankingsResponse(RANKING_FIXTURE_FUNDS, {
      benchmark: 'msci world',
    });

    expect(response.data).toHaveLength(1);
    expect(response.data[0]?.benchmarkKey).toBe('msci world');
    expect(response.data[0]?.funds).toHaveLength(2);
  });

  it('should return an empty list when the benchmark has no eligible funds', () => {
    const response = buildRankingsResponse(RANKING_FIXTURE_FUNDS, {
      benchmark: 'NASDAQ 100',
    });

    expect(response.data).toEqual([]);
  });

  it('should apply the per-group limit without changing total', () => {
    const response = buildRankingsResponse(RANKING_FIXTURE_FUNDS, {
      benchmark: 'S&P 500',
      limit: 1,
    });

    expect(response.data[0]).toMatchObject({
      total: 2,
      funds: [expect.objectContaining({ symbol: 'IVV', rank: 1 })],
    });
  });

  it('should match benchmark filters case-insensitively', () => {
    const response = buildRankingsResponse(RANKING_FIXTURE_FUNDS, {
      benchmark: 's&p 500',
    });

    expect(response.data).toHaveLength(1);
    expect(response.data[0]?.funds.map((fund) => fund.symbol)).toEqual([
      'IVV',
      'SPY',
    ]);
  });
});
