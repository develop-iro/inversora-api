import { z } from 'zod';
import { invesoraScoreSchema } from '../../scoring/entities/invesora-score.schema';

/** ISO calendar date used for materialized return snapshots. */
export const fundMaterializedReturnAsOfSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/);

/** Persisted materialized fields written during sync, read on HTTP list/detail. */
export const fundMaterializedFieldsSchema = z.object({
  return1y: z.number().nullable(),
  return3y: z.number().nullable(),
  returnYtd: z.number().nullable(),
  returnAsOf: fundMaterializedReturnAsOfSchema.nullable(),
  scoreBreakdown: invesoraScoreSchema.nullable(),
  peerGroupKey: z.string().min(1).nullable(),
  peerRank: z.number().int().positive().nullable(),
});

/** Inferred type for persisted materialized fund fields. */
export type FundMaterializedFields = z.infer<
  typeof fundMaterializedFieldsSchema
>;

/** Input for updating materialized return columns after price sync. */
export const updateFundMaterializedReturnsInputSchema =
  fundMaterializedFieldsSchema.pick({
    return1y: true,
    return3y: true,
    returnYtd: true,
    returnAsOf: true,
  });

/** Input type for updating materialized return columns. */
export type UpdateFundMaterializedReturnsInput = z.infer<
  typeof updateFundMaterializedReturnsInputSchema
>;

/** Input for updating materialized scoring columns after RN-04 batch. */
export const updateFundMaterializedScoringInputSchema = z.object({
  score: z.number().min(0).max(100),
  scoreBreakdown: invesoraScoreSchema,
  peerGroupKey: z.string().min(1),
  peerRank: z.number().int().positive().nullable(),
});

/** Input type for updating materialized scoring columns. */
export type UpdateFundMaterializedScoringInput = z.infer<
  typeof updateFundMaterializedScoringInputSchema
>;
