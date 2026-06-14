import type { Fund } from '../../funds/entities/fund.schema';
import { isCatalogVisible } from '../../funds/entities/catalog-visibility.schema';
import { resolveScoringPeerGroupKey } from './fund-scoring-metrics.builder';
import type {
  BenchmarkRankingGroup,
  RankedFundEntry,
  RankingsQuery,
  RankingsResponse,
} from './ranking.schema';
import { rankingsResponseSchema } from './ranking.schema';

/**
 * Normalizes a benchmark label for peer-group matching.
 *
 * @param benchmark - Raw benchmark label.
 */
export function normalizeBenchmarkKey(benchmark: string): string {
  return benchmark.trim().toLowerCase();
}

/**
 * Returns whether a fund satisfies the minimum data required for public rankings.
 *
 * @param fund - Persisted fund entity.
 */
export function isRankingEligible(fund: Fund): boolean {
  if (!isCatalogVisible(fund)) {
    return false;
  }

  const benchmark = fund.benchmark?.trim();

  return (
    benchmark !== undefined &&
    benchmark.length > 0 &&
    fund.isin !== null &&
    fund.score !== null &&
    fund.metrics.ter !== null
  );
}

/**
 * Compares two rankable funds by score (desc) and symbol (asc) for stable ordering.
 *
 * @param left - Left-hand fund.
 * @param right - Right-hand fund.
 */
function compareRankableFunds(left: Fund, right: Fund): number {
  const scoreDifference = right.score! - left.score!;

  if (scoreDifference !== 0) {
    return scoreDifference;
  }

  return left.symbol.localeCompare(right.symbol);
}

/**
 * Maps a persisted fund to a ranked entry with the provided position.
 *
 * @param fund - Persisted fund entity.
 * @param rank - 1-based position inside the benchmark group.
 */
export function mapFundToRankedEntry(
  fund: Fund,
  rank: number,
): RankedFundEntry {
  return {
    rank,
    id: fund.id,
    symbol: fund.symbol,
    isin: fund.isin!,
    name: fund.name,
    score: fund.score!,
    benchmark: fund.benchmark!.trim(),
    currency: fund.currency,
    riskLevel: fund.riskLevel,
    ter: fund.metrics.ter!,
  };
}

/**
 * Builds benchmark-scoped ranking groups from persisted funds (RN-02).
 *
 * @param funds - Persisted fund entities.
 * @param query - Validated rankings query.
 */
export function buildRankingsResponse(
  funds: readonly Fund[],
  query: RankingsQuery,
): RankingsResponse {
  const benchmarkFilter =
    query.benchmark === undefined
      ? undefined
      : normalizeBenchmarkKey(query.benchmark);

  const grouped = new Map<string, Fund[]>();

  for (const fund of funds) {
    if (!isRankingEligible(fund)) {
      continue;
    }

    const benchmarkKey = resolveScoringPeerGroupKey(fund);

    if (benchmarkFilter !== undefined && benchmarkKey !== benchmarkFilter) {
      continue;
    }

    const group = grouped.get(benchmarkKey) ?? [];
    group.push(fund);
    grouped.set(benchmarkKey, group);
  }

  const data: BenchmarkRankingGroup[] = [...grouped.entries()]
    .sort(([leftKey], [rightKey]) => leftKey.localeCompare(rightKey))
    .map(([benchmarkKey, groupFunds]) => {
      const sortedFunds = [...groupFunds].sort(compareRankableFunds);
      const limitedFunds =
        query.limit === undefined
          ? sortedFunds
          : sortedFunds.slice(0, query.limit);

      return {
        benchmark: limitedFunds[0]?.benchmark?.trim() ?? benchmarkKey,
        benchmarkKey,
        total: sortedFunds.length,
        funds: limitedFunds.map((fund, index) =>
          mapFundToRankedEntry(fund, index + 1),
        ),
      };
    });

  return rankingsResponseSchema.parse({ data });
}
