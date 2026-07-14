import type { Fund } from '../../funds/entities/fund.schema';
import { mapMaterializedFieldsToReturnSnapshot } from '../../funds/entities/fund-materialized.mapper';
import { mergeReturnSnapshots } from '../../funds/entities/fund-returns.enricher';
import type { FundReturnSnapshot } from '../../funds/entities/fund-return-snapshot.schema';
import { isCatalogVisible } from '../../funds/entities/catalog-visibility.schema';
import { resolveScoringPeerGroupKey } from './fund-scoring-metrics.builder';
import type {
  BenchmarkRankingGroup,
  RankedFundEntry,
  RankingsQuery,
  RankingsResponse,
} from './ranking.schema';
import { RANKINGS_DEFAULT_GROUPS_LIMIT } from '../../../core/api/schemas/rankings.schema';
import { rankingsResponseSchema } from './ranking.schema';
import type { RankingFundsAggregation } from '../../funds/repositories/ranking-funds.query';

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
 * @param returnFallbacks - Optional price-derived return snapshots keyed by fund id.
 */
export function mapFundToRankedEntry(
  fund: Fund,
  rank: number,
  returnFallbacks?: ReadonlyMap<string, FundReturnSnapshot>,
): RankedFundEntry {
  const returns = mergeReturnSnapshots(
    mapMaterializedFieldsToReturnSnapshot(fund.materialized),
    returnFallbacks?.get(fund.id),
  );

  return {
    rank: fund.materialized.peerRank ?? rank,
    id: fund.id,
    symbol: fund.symbol,
    isin: fund.isin!,
    name: fund.name,
    score: fund.score!,
    benchmark: fund.benchmark!.trim(),
    currency: fund.currency,
    riskLevel: fund.riskLevel,
    ter: fund.metrics.ter!,
    returns,
  };
}

/**
 * Builds benchmark-scoped ranking groups from persisted funds (RN-02).
 *
 * @param funds - Persisted fund entities (typically top-N per group from SQL).
 * @param query - Validated rankings query.
 * @param aggregation - Optional precomputed group totals for bounded SQL reads.
 * @param returnFallbacks - Optional price-derived return snapshots keyed by fund id.
 */
export function buildRankingsResponse(
  funds: readonly Fund[],
  query: RankingsQuery,
  aggregation?: RankingFundsAggregation,
  returnFallbacks?: ReadonlyMap<string, FundReturnSnapshot>,
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

  const sortedGroups = [...grouped.entries()].sort(([leftKey], [rightKey]) => {
    const leftTotal =
      aggregation?.groupTotals.get(leftKey) ??
      grouped.get(leftKey)?.length ??
      0;
    const rightTotal =
      aggregation?.groupTotals.get(rightKey) ??
      grouped.get(rightKey)?.length ??
      0;
    const totalDifference = rightTotal - leftTotal;

    if (totalDifference !== 0) {
      return totalDifference;
    }

    return leftKey.localeCompare(rightKey);
  });

  const groupsLimit = query.groupsLimit ?? RANKINGS_DEFAULT_GROUPS_LIMIT;

  const cappedGroups =
    benchmarkFilter === undefined
      ? sortedGroups.slice(0, groupsLimit)
      : sortedGroups;

  const data: BenchmarkRankingGroup[] = cappedGroups.map(
    ([benchmarkKey, groupFunds]) => {
      const sortedFunds = [...groupFunds].sort(compareRankableFunds);
      const limitedFunds = sortedFunds.slice(0, query.limit);

      return {
        benchmark: limitedFunds[0]?.benchmark?.trim() ?? benchmarkKey,
        benchmarkKey,
        total: aggregation?.groupTotals.get(benchmarkKey) ?? sortedFunds.length,
        funds: limitedFunds.map((fund, index) =>
          mapFundToRankedEntry(fund, index + 1, returnFallbacks),
        ),
      };
    },
  );

  const totalGroups = aggregation?.totalGroups ?? sortedGroups.length;

  const totalEligibleFunds =
    aggregation?.totalEligibleFunds ??
    sortedGroups.reduce((sum, [, groupFunds]) => sum + groupFunds.length, 0);

  return rankingsResponseSchema.parse({
    data,
    meta: {
      totalGroups,
      returnedGroups: data.length,
      groupsLimit,
      limit: query.limit,
      hasMoreGroups: benchmarkFilter === undefined && totalGroups > data.length,
      totalEligibleFunds,
    },
  });
}
