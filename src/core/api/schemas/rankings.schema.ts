import { z } from 'zod';

/** Query schema for `GET /rankings`. */
export const rankingsQuerySchema = z.object({
  benchmark: z.string().trim().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
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

/** Response schema for `GET /rankings`. */
export const rankingsResponseSchema = z.object({
  data: z.array(benchmarkRankingGroupSchema),
});

/** Response type for `GET /rankings`. */
export type RankingsResponse = z.infer<typeof rankingsResponseSchema>;
