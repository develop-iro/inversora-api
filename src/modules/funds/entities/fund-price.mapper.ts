import type { FundPrice as PrismaFundPrice, Prisma } from '@prisma/client';
import type { Decimal } from '@prisma/client/runtime/library';
import type { IndexFundHistoricalPrice } from '../../providers/financial-modeling-prep/financial-modeling-prep.domain.schemas';
import { fundPriceSchema } from './fund-price.schema';
import type { FundPrice, UpsertFundPriceInput } from './fund-price.schema';

/**
 * Parses an ISO date string into a UTC date-only value for Prisma.
 *
 * @param date - ISO date string (`YYYY-MM-DD`).
 * @returns UTC date value stored in PostgreSQL `DATE` columns.
 */
export function parseFundPriceDate(date: string): Date {
  return new Date(`${date}T00:00:00.000Z`);
}

/**
 * Formats a persisted date-only value as an ISO date string.
 *
 * @param date - Persisted date value.
 * @returns ISO date string (`YYYY-MM-DD`).
 */
export function formatFundPriceDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

/**
 * Adds calendar days to an ISO date-only string.
 *
 * @param date - ISO date string (`YYYY-MM-DD`).
 * @param days - Number of days to add.
 * @returns Resulting ISO date string.
 */
export function addDaysToIsoDate(date: string, days: number): string {
  const parsedDate = parseFundPriceDate(date);
  parsedDate.setUTCDate(parsedDate.getUTCDate() + days);

  return formatFundPriceDate(parsedDate);
}

/**
 * Compares two ISO date-only strings.
 *
 * @param left - Left ISO date string.
 * @param right - Right ISO date string.
 * @returns `-1`, `0`, or `1`.
 */
export function compareIsoDates(left: string, right: string): number {
  return left.localeCompare(right);
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
 * Maps a nullable Prisma bigint volume to a domain number.
 *
 * @param value - Nullable Prisma bigint column.
 * @returns Domain number or `null`.
 */
function mapNullableVolume(value: bigint | null): number | null {
  return value === null ? null : Number(value);
}

/**
 * Maps a Prisma fund price row to the domain entity.
 *
 * @param record - Persisted Prisma fund price row.
 * @returns Validated fund price entity.
 */
export function mapPrismaFundPriceToFundPrice(record: PrismaFundPrice): FundPrice {
  return fundPriceSchema.parse({
    id: record.id,
    fundId: record.fundId,
    date: formatFundPriceDate(record.date),
    open: record.open.toNumber(),
    high: record.high.toNumber(),
    low: record.low.toNumber(),
    close: record.close.toNumber(),
    volume: mapNullableVolume(record.volume),
    change: mapNullableDecimal(record.change),
    changePercent: mapNullableDecimal(record.changePercent),
    vwap: mapNullableDecimal(record.vwap),
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
  });
}

/**
 * Maps a normalized provider price point to an upsert input row.
 *
 * @param price - Normalized provider historical price.
 * @returns Upsert input for persistence.
 */
export function mapIndexFundHistoricalPriceToUpsertInput(
  price: IndexFundHistoricalPrice,
): UpsertFundPriceInput {
  return {
    date: price.date,
    open: price.open,
    high: price.high,
    low: price.low,
    close: price.close,
    volume: price.volume ?? null,
    change: price.change ?? null,
    changePercent: price.changePercent ?? null,
    vwap: price.vwap ?? null,
  };
}

/**
 * Maps an upsert input row to Prisma create/update payload fields.
 *
 * @param fundId - Persisted fund identifier.
 * @param price - Upsert input row.
 * @returns Prisma payload for create and update operations.
 */
export function mapUpsertFundPriceInputToPrismaData(
  fundId: string,
  price: UpsertFundPriceInput,
): Prisma.FundPriceUncheckedCreateInput {
  return {
    fundId,
    date: parseFundPriceDate(price.date),
    open: price.open,
    high: price.high,
    low: price.low,
    close: price.close,
    volume: price.volume === null ? null : BigInt(price.volume),
    change: price.change,
    changePercent: price.changePercent,
    vwap: price.vwap,
  };
}
