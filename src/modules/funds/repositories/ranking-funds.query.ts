import { Prisma, type Fund as PrismaFund } from '@prisma/client';
import type { RankingsQuery } from '../../../core/api/schemas/rankings.schema';
import { RANKINGS_DEFAULT_GROUPS_LIMIT } from '../../../core/api/schemas/rankings.schema';
import { mapPrismaFundToFund } from '../entities/fund.mapper';
import type { Fund } from '../entities/fund.schema';

/** Aggregated ranking counts used to build bounded ranking responses. */
export type RankingFundsAggregation = {
  groupTotals: ReadonlyMap<string, number>;
  totalGroups: number;
  totalEligibleFunds: number;
};

const RANKING_FUND_COLUMNS = Prisma.sql`
  id, symbol, isin, name, provider, category, vehicle, currency, benchmark,
  "assetClass", domicile, "investmentTheme", issuer,
  volatility, drawdown, ter, aum, per, "dividendYield", "trackingError",
  "riskLevel", score, return1y, return3y, "returnYtd", "returnAsOf",
  "scoreBreakdown", "peerGroupKey", "peerRank",
  badge, "themeLabel", "idealForBeginners", "catalogVisibility",
  "createdAt", "updatedAt"
`;

/**
 * Normalizes a benchmark label for peer-group matching.
 *
 * @param benchmark - Raw benchmark label.
 */
function normalizeRankingBenchmarkKey(benchmark: string): string {
  return benchmark.trim().toLowerCase();
}

/**
 * Shared eligibility predicate for ranking SQL queries.
 */
function buildRankingEligibleWhereSql(benchmarkKey: string | null): Prisma.Sql {
  const benchmarkFilter =
    benchmarkKey === null
      ? Prisma.empty
      : Prisma.sql`AND "peerGroupKey" = ${benchmarkKey}`;

  return Prisma.sql`
    "catalogVisibility" != 'BLOCKED'
    AND benchmark IS NOT NULL
    AND isin IS NOT NULL
    AND score IS NOT NULL
    AND ter IS NOT NULL
    AND "peerGroupKey" IS NOT NULL
    ${benchmarkFilter}
  `;
}

/**
 * Loads top-ranked funds per peer group using SQL window functions.
 *
 * @param prisma - Prisma client.
 * @param query - Validated rankings query.
 */
export async function queryRankingFundsForQuery(
  prisma: { $queryRaw: <T>(query: Prisma.Sql) => Promise<T> },
  query: RankingsQuery,
): Promise<Fund[]> {
  const benchmarkKey =
    query.benchmark === undefined
      ? null
      : normalizeRankingBenchmarkKey(query.benchmark);
  const perGroupLimit = query.limit;
  const groupsLimit = query.groupsLimit ?? RANKINGS_DEFAULT_GROUPS_LIMIT;
  const eligibleWhere = buildRankingEligibleWhereSql(benchmarkKey);
  const topGroupsLimitSql =
    benchmarkKey === null ? Prisma.sql`LIMIT ${groupsLimit}` : Prisma.empty;

  const records = await prisma.$queryRaw<PrismaFund[]>(Prisma.sql`
    WITH eligible AS (
      SELECT *
      FROM "funds"
      WHERE ${eligibleWhere}
    ),
    group_sizes AS (
      SELECT "peerGroupKey", COUNT(*)::int AS total
      FROM eligible
      GROUP BY "peerGroupKey"
    ),
    top_groups AS (
      SELECT "peerGroupKey"
      FROM group_sizes
      ORDER BY total DESC, "peerGroupKey" ASC
      ${topGroupsLimitSql}
    ),
    ranked AS (
      SELECT
        e.*,
        ROW_NUMBER() OVER (
          PARTITION BY e."peerGroupKey"
          ORDER BY e.score DESC, e.symbol ASC
        )::int AS rn
      FROM eligible e
      INNER JOIN top_groups tg ON e."peerGroupKey" = tg."peerGroupKey"
    )
    SELECT ${RANKING_FUND_COLUMNS}
    FROM ranked
    WHERE rn <= ${perGroupLimit}
    ORDER BY "peerGroupKey", rn
  `);

  return records.map((record) => mapPrismaFundToFund(record));
}

/**
 * Loads peer-group totals for ranking metadata.
 *
 * @param prisma - Prisma client.
 * @param benchmarkKey - Optional normalized benchmark filter.
 */
export async function queryRankingGroupTotals(
  prisma: { $queryRaw: <T>(query: Prisma.Sql) => Promise<T> },
  benchmarkKey: string | null,
): Promise<ReadonlyMap<string, number>> {
  const eligibleWhere = buildRankingEligibleWhereSql(benchmarkKey);
  const rows = await prisma.$queryRaw<
    Array<{ peerGroupKey: string; total: number }>
  >(Prisma.sql`
    SELECT "peerGroupKey", COUNT(*)::int AS total
    FROM "funds"
    WHERE ${eligibleWhere}
    GROUP BY "peerGroupKey"
    ORDER BY total DESC, "peerGroupKey" ASC
  `);

  return new Map(rows.map((row) => [row.peerGroupKey, row.total]));
}

/**
 * Counts ranking-eligible funds for response metadata.
 *
 * @param prisma - Prisma client.
 * @param benchmarkKey - Optional normalized benchmark filter.
 */
export async function countRankingEligibleFunds(
  prisma: { $queryRaw: <T>(query: Prisma.Sql) => Promise<T> },
  benchmarkKey: string | null,
): Promise<number> {
  const eligibleWhere = buildRankingEligibleWhereSql(benchmarkKey);
  const rows = await prisma.$queryRaw<Array<{ total: number }>>(Prisma.sql`
    SELECT COUNT(*)::int AS total
    FROM "funds"
    WHERE ${eligibleWhere}
  `);

  return rows[0]?.total ?? 0;
}

/**
 * Loads ranking aggregation metadata for bounded ranking responses.
 *
 * @param prisma - Prisma client.
 * @param query - Validated rankings query.
 */
export async function queryRankingFundsAggregation(
  prisma: { $queryRaw: <T>(query: Prisma.Sql) => Promise<T> },
  query: RankingsQuery,
): Promise<RankingFundsAggregation> {
  const benchmarkKey =
    query.benchmark === undefined
      ? null
      : normalizeRankingBenchmarkKey(query.benchmark);
  const [groupTotals, totalEligibleFunds] = await Promise.all([
    queryRankingGroupTotals(prisma, benchmarkKey),
    countRankingEligibleFunds(prisma, benchmarkKey),
  ]);

  return {
    groupTotals,
    totalGroups: groupTotals.size,
    totalEligibleFunds,
  };
}
