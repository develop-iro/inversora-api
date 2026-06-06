import {
  FundAllocationCategory as PrismaFundAllocationCategory,
  type FundAllocation as PrismaFundAllocation,
  type FundHolding as PrismaFundHolding,
  type Prisma,
} from '@prisma/client';
import type { Decimal } from '@prisma/client/runtime/library';
import type { IndexFundHolding } from '../../providers/financial-modeling-prep/financial-modeling-prep.domain.schemas';
import {
  formatFundPriceDate,
  parseFundPriceDate,
} from './fund-price.mapper';
import {
  fundAllocationSchema,
  fundHoldingSchema,
} from './fund-composition.schema';
import type {
  FundAllocation,
  FundAllocationCategory,
  FundHolding,
  UpsertFundAllocationInput,
  UpsertFundHoldingInput,
} from './fund-composition.schema';

/**
 * Maps a domain allocation category to the Prisma enum value.
 *
 * @param category - Domain allocation category.
 * @returns Prisma allocation category enum.
 */
export function mapFundAllocationCategoryToPrisma(
  category: FundAllocationCategory,
): PrismaFundAllocationCategory {
  switch (category) {
    case 'sectorial':
      return PrismaFundAllocationCategory.SECTORIAL;
    case 'regional':
      return PrismaFundAllocationCategory.REGIONAL;
    case 'assetAllocation':
      return PrismaFundAllocationCategory.ASSET_ALLOCATION;
    case 'capitalization':
      return PrismaFundAllocationCategory.CAPITALIZATION;
    case 'portfolio':
      return PrismaFundAllocationCategory.PORTFOLIO;
    default: {
      const exhaustiveCheck: never = category;
      return exhaustiveCheck;
    }
  }
}

/**
 * Maps a Prisma allocation category enum to the domain value.
 *
 * @param category - Prisma allocation category enum.
 * @returns Domain allocation category value.
 */
export function mapPrismaFundAllocationCategory(
  category: PrismaFundAllocationCategory,
): FundAllocationCategory {
  switch (category) {
    case PrismaFundAllocationCategory.SECTORIAL:
      return 'sectorial';
    case PrismaFundAllocationCategory.REGIONAL:
      return 'regional';
    case PrismaFundAllocationCategory.ASSET_ALLOCATION:
      return 'assetAllocation';
    case PrismaFundAllocationCategory.CAPITALIZATION:
      return 'capitalization';
    case PrismaFundAllocationCategory.PORTFOLIO:
      return 'portfolio';
    default: {
      const exhaustiveCheck: never = category;
      return exhaustiveCheck;
    }
  }
}

/**
 * Maps a nullable Prisma decimal to a domain number.
 *
 * @param value - Nullable Prisma decimal column.
 * @returns Domain number or `null`.
 */
function mapNullableDecimal(value: Decimal | null): number | null {
  return value === null ? null : value.toNumber();
}

/**
 * Maps a Prisma fund holding row to the domain entity.
 *
 * @param record - Persisted Prisma fund holding row.
 * @returns Validated fund holding entity.
 */
export function mapPrismaFundHoldingToFundHolding(
  record: PrismaFundHolding,
): FundHolding {
  return fundHoldingSchema.parse({
    id: record.id,
    fundId: record.fundId,
    asOf: formatFundPriceDate(record.asOf),
    rank: record.rank,
    asset: record.asset,
    name: record.name,
    isin: record.isin,
    weightPercentage: record.weightPercentage.toNumber(),
    marketValue: mapNullableDecimal(record.marketValue),
    sharesNumber: mapNullableDecimal(record.sharesNumber),
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
  });
}

/**
 * Maps a Prisma fund allocation row to the domain entity.
 *
 * @param record - Persisted Prisma fund allocation row.
 * @returns Validated fund allocation entity.
 */
export function mapPrismaFundAllocationToFundAllocation(
  record: PrismaFundAllocation,
): FundAllocation {
  return fundAllocationSchema.parse({
    id: record.id,
    fundId: record.fundId,
    asOf: formatFundPriceDate(record.asOf),
    category: mapPrismaFundAllocationCategory(record.category),
    label: record.label,
    weight: record.weight.toNumber(),
    sortOrder: record.sortOrder,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
  });
}

/**
 * Maps normalized provider holdings to upsert inputs with rank ordering.
 *
 * @param holdings - Normalized provider holdings sorted by weight descending.
 * @returns Upsert inputs with sequential ranks.
 */
export function mapIndexFundHoldingsToUpsertInputs(
  holdings: readonly IndexFundHolding[],
): UpsertFundHoldingInput[] {
  return [...holdings]
    .sort((left, right) => right.weightPercentage - left.weightPercentage)
    .map((holding, index) => ({
    rank: index + 1,
    asset: holding.asset ?? null,
    name: holding.name,
    isin: holding.isin ?? null,
    weightPercentage: holding.weightPercentage,
    marketValue: holding.marketValue ?? null,
    sharesNumber: holding.sharesNumber ?? null,
  }));
}

/**
 * Maps a holding upsert input to Prisma create payload fields.
 *
 * @param fundId - Persisted fund identifier.
 * @param asOf - Snapshot ISO date.
 * @param holding - Holding upsert input.
 * @returns Prisma payload for create operations.
 */
export function mapUpsertFundHoldingInputToPrismaData(
  fundId: string,
  asOf: string,
  holding: UpsertFundHoldingInput,
): Prisma.FundHoldingUncheckedCreateInput {
  return {
    fundId,
    asOf: parseFundPriceDate(asOf),
    rank: holding.rank,
    asset: holding.asset,
    name: holding.name,
    isin: holding.isin,
    weightPercentage: holding.weightPercentage,
    marketValue: holding.marketValue,
    sharesNumber: holding.sharesNumber,
  };
}

/**
 * Maps an allocation upsert input to Prisma create payload fields.
 *
 * @param fundId - Persisted fund identifier.
 * @param asOf - Snapshot ISO date.
 * @param allocation - Allocation upsert input.
 * @returns Prisma payload for create operations.
 */
export function mapUpsertFundAllocationInputToPrismaData(
  fundId: string,
  asOf: string,
  allocation: UpsertFundAllocationInput,
): Prisma.FundAllocationUncheckedCreateInput {
  return {
    fundId,
    asOf: parseFundPriceDate(asOf),
    category: mapFundAllocationCategoryToPrisma(allocation.category),
    label: allocation.label,
    weight: allocation.weight,
    sortOrder: allocation.sortOrder,
  };
}
