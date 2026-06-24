import { z } from 'zod';
import type { FundMetrics } from '../../funds/entities/fund.schema';

/** Breakdown entry for a single scoring factor. */
export const scoreFactorBreakdownSchema = z.object({
  points: z.number().min(0),
  maxPoints: z.number().positive(),
  label: z.string().min(1),
  incomplete: z.boolean().optional(),
});

/** Inferred type for a single scoring factor breakdown. */
export type ScoreFactorBreakdown = z.infer<typeof scoreFactorBreakdownSchema>;

/** Full Invesora Score response schema. */
export const invesoraScoreSchema = z.object({
  score: z.number().min(0).max(100),
  version: z.string().min(1),
  breakdown: z.object({
    ter: scoreFactorBreakdownSchema,
    tracking: scoreFactorBreakdownSchema,
    aum: scoreFactorBreakdownSchema,
    age: scoreFactorBreakdownSchema,
  }),
  summary: z.string().min(1),
  warnings: z.array(z.string()),
});

/** Inferred type for the Invesora Score response. */
export type InvesoraScore = z.infer<typeof invesoraScoreSchema>;

/**
 * Extended metrics required to compute the Invesora Score.
 *
 * Builds on persisted {@link FundMetrics} with derived return, composition,
 * and age fields that may come from price history or provider snapshots.
 */
export type FundScoringMetrics = FundMetrics & {
  /** Annualized 1-year return as a percentage (e.g. 15 = 15%). */
  return1Y: number | null;
  /** Annualized 3-year return as a percentage, when available. */
  return3Y: number | null;
  /** Number of portfolio holdings in the latest snapshot. */
  holdingsCount: number | null;
  /** Combined weight of the top 10 holdings as a percentage. */
  top10Weight: number | null;
  /** Largest single sector weight as a percentage. */
  maxSectorWeight: number | null;
  /** Fund age in whole years since inception or oldest available price. */
  fundAgeYears: number | null;
};

/** Optional peer context for category-relative scoring. */
export type ScoringPeerContext = {
  /** Peer metrics grouped within the same benchmark or category. */
  peers: readonly FundScoringMetrics[];
};
