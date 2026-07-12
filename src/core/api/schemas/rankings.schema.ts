import { z } from 'zod';
import { fundReturnSnapshotSchema } from '../../../modules/funds/entities/fund-return-snapshot.schema';

/**
 * Default benchmark groups returned when no `benchmark` filter is provided.
 * Keeps payloads bounded for mobile clients and price enrichment.
 */
export const RANKINGS_DEFAULT_GROUPS_LIMIT = 24;

/** Maximum benchmark groups returned when no benchmark filter is provided. */
export const RANKINGS_MAX_GROUPS_LIMIT = 100;

/** Default ranked funds per group when `limit` is omitted. */
export const RANKINGS_DEFAULT_FUNDS_PER_GROUP = 10;

/** Query schema for `GET /rankings`. */
export const rankingsQuerySchema = z.object({
  benchmark: z.string().trim().min(1).optional(),
  limit: z.coerce
    .number()
    .int()
    .min(1)
    .max(100)
    .default(RANKINGS_DEFAULT_FUNDS_PER_GROUP),
  groupsLimit: z.coerce
    .number()
    .int()
    .min(1)
    .max(RANKINGS_MAX_GROUPS_LIMIT)
    .default(RANKINGS_DEFAULT_GROUPS_LIMIT),
});

/** Parsed query type for `GET /rankings`. */
export type RankingsQuery = z.infer<typeof rankingsQuerySchema>;

/** Ranked fund entry returned inside a benchmark group. */
export const rankedFundEntrySchema = z.object({
  rank: z.number().int().positive(),
  id: z.uuid(),
  symbol: z.string().min(1),
  isin: z.string().min(1),
  name: z.string().min(1),
  score: z.number().min(0).max(100),
  benchmark: z.string().min(1),
  currency: z
    .string()
    .length(3)
    .regex(/^[A-Z]{3}$/, 'Currency must be a 3-letter ISO 4217 code'),
  riskLevel: z.number().int().min(1).max(7).nullable(),
  ter: z.number().nonnegative(),
  returns: fundReturnSnapshotSchema,
});

/** Inferred type for a ranked fund entry. */
export type RankedFundEntry = z.infer<typeof rankedFundEntrySchema>;

/** Benchmark-scoped ranking group (RN-02). */
export const benchmarkRankingGroupSchema = z.object({
  benchmark: z.string().min(1),
  benchmarkKey: z.string().min(1),
  total: z.number().int().nonnegative(),
  funds: z.array(rankedFundEntrySchema),
});

/** Inferred type for a benchmark ranking group. */
export type BenchmarkRankingGroup = z.infer<typeof benchmarkRankingGroupSchema>;

/** Pagination metadata for benchmark group listings. */
export const rankingsMetaSchema = z.object({
  totalGroups: z.number().int().nonnegative(),
  returnedGroups: z.number().int().nonnegative(),
  groupsLimit: z.number().int().positive(),
  limit: z.number().int().positive(),
  hasMoreGroups: z.boolean(),
  /** Total ranking-eligible funds across all benchmark groups before pagination. */
  totalEligibleFunds: z.number().int().nonnegative(),
});

/** Inferred type for rankings pagination metadata. */
export type RankingsMeta = z.infer<typeof rankingsMetaSchema>;

/** Response schema for `GET /rankings`. */
export const rankingsResponseSchema = z.object({
  data: z.array(benchmarkRankingGroupSchema),
  meta: rankingsMetaSchema,
});

/** Response type for `GET /rankings`. */
export type RankingsResponse = z.infer<typeof rankingsResponseSchema>;
