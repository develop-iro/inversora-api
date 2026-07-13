import type { Prisma } from '@prisma/client';
import type { Decimal } from '@prisma/client/runtime/client';
import { invesoraScoreSchema } from '../../scoring/entities/invesora-score.schema';
import type { InvesoraScore } from '../../scoring/entities/invesora-score.schema';
import type { Fund } from './fund.schema';
import {
  fundMaterializedFieldsSchema,
  type FundMaterializedFields,
  type UpdateFundMaterializedReturnsInput,
  type UpdateFundMaterializedScoringInput,
} from './fund-materialized.schema';
import type { FundReturnSnapshot } from './fund-return-snapshot.schema';

/**
 * Maps a nullable Prisma decimal to a domain number.
 *
 * @param value - Nullable Prisma decimal column.
 */
function mapNullableDecimal(value: Decimal | null | undefined): number | null {
  return value == null ? null : value.toNumber();
}

/**
 * Formats a nullable Prisma date column as an ISO calendar date.
 *
 * @param value - Nullable Prisma date column.
 */
function mapNullableDate(value: Date | null): string | null {
  if (value === null) {
    return null;
  }

  return value.toISOString().slice(0, 10);
}

/**
 * Parses persisted score breakdown JSON into a validated Invesora Score.
 *
 * @param value - Raw JSON column value.
 */
export function parsePersistedScoreBreakdown(
  value: unknown,
): InvesoraScore | null {
  if (value === null || value === undefined) {
    return null;
  }

  const parsed = invesoraScoreSchema.safeParse(value);

  return parsed.success ? parsed.data : null;
}

/**
 * Maps persisted materialized columns to the domain materialized fields object.
 *
 * @param record - Prisma fund row subset.
 */
export function mapPrismaFundMaterializedFields(record: {
  return1y: Decimal | null;
  return3y: Decimal | null;
  returnYtd: Decimal | null;
  returnAsOf: Date | null;
  scoreBreakdown: Prisma.JsonValue | null;
  peerGroupKey: string | null;
  peerRank: number | null;
}): FundMaterializedFields {
  return fundMaterializedFieldsSchema.parse({
    return1y: mapNullableDecimal(record.return1y),
    return3y: mapNullableDecimal(record.return3y),
    returnYtd: mapNullableDecimal(record.returnYtd),
    returnAsOf: mapNullableDate(record.returnAsOf),
    scoreBreakdown: parsePersistedScoreBreakdown(record.scoreBreakdown),
    peerGroupKey: record.peerGroupKey,
    peerRank: record.peerRank,
  });
}

/**
 * Maps materialized return columns to the public API return snapshot shape.
 *
 * @param materialized - Persisted materialized fund fields.
 */
export function mapMaterializedFieldsToReturnSnapshot(
  materialized: Pick<
    FundMaterializedFields,
    'return1y' | 'return3y' | 'returnYtd' | 'returnAsOf'
  >,
): FundReturnSnapshot {
  return {
    ytd: materialized.returnYtd,
    oneYear: materialized.return1y,
    threeYear: materialized.return3y,
    asOf: materialized.returnAsOf,
  };
}

/**
 * Maps domain return update input to Prisma update data.
 *
 * @param input - Materialized return payload.
 */
export function mapUpdateFundMaterializedReturnsToPrisma(
  input: UpdateFundMaterializedReturnsInput,
): Prisma.FundUpdateInput {
  return {
    return1y: input.return1y,
    return3y: input.return3y,
    returnYtd: input.returnYtd,
    returnAsOf:
      input.returnAsOf === null
        ? null
        : new Date(`${input.returnAsOf}T00:00:00.000Z`),
  };
}

/**
 * Maps domain scoring materialization input to Prisma update data.
 *
 * @param input - Materialized scoring payload.
 */
export function mapUpdateFundMaterializedScoringToPrisma(
  input: UpdateFundMaterializedScoringInput,
): Prisma.FundUpdateInput {
  return {
    score: input.score,
    scoreBreakdown: input.scoreBreakdown,
    peerGroupKey: input.peerGroupKey,
    peerRank: input.peerRank,
  };
}

const PENDING_BREAKDOWN_FACTOR = {
  points: 0,
  maxPoints: 25,
  label: 'Pendiente de sincronización',
  incomplete: true,
} as const;

/**
 * Resolves the persisted Inversora Score for HTTP reads.
 *
 * Uses materialized breakdown when present; otherwise builds a degraded payload
 * from the persisted scalar score so pre-backfill deploys do not hard-fail detail.
 *
 * @param fund - Persisted fund with materialized scoring columns.
 */
export function resolvePersistedInvesoraScore(
  fund: Pick<Fund, 'score' | 'materialized'>,
): InvesoraScore | null {
  if (fund.materialized.scoreBreakdown !== null) {
    return fund.materialized.scoreBreakdown;
  }

  if (fund.score === null) {
    return null;
  }

  return invesoraScoreSchema.parse({
    score: fund.score,
    version: 'rn-04',
    breakdown: {
      ter: { ...PENDING_BREAKDOWN_FACTOR },
      tracking: { ...PENDING_BREAKDOWN_FACTOR },
      aum: { ...PENDING_BREAKDOWN_FACTOR },
      age: { ...PENDING_BREAKDOWN_FACTOR },
    },
    summary:
      'Puntuación disponible; el desglose detallado se actualizará tras la sincronización.',
    warnings: ['Desglose detallado no disponible todavía.'],
  });
}
