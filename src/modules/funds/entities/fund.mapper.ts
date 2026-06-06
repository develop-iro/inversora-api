import {
  FundCategory as PrismaFundCategory,
  FundProvider as PrismaFundProvider,
  type Fund as PrismaFund,
} from '@prisma/client';
import type { Decimal } from '@prisma/client/runtime/library';
import { fundSchema } from './fund.schema';
import type { Fund, FundCategory, FundMetrics, FundProvider } from './fund.schema';

/**
 * Maps a Prisma fund provider enum to the domain provider value.
 *
 * @param provider - Prisma fund provider enum.
 * @returns Domain provider value.
 */
export function mapPrismaFundProvider(
  provider: PrismaFundProvider,
): FundProvider {
  switch (provider) {
    case PrismaFundProvider.FINANCIAL_MODELING_PREP:
      return 'financial-modeling-prep';
    default: {
      const exhaustiveCheck: never = provider;
      return exhaustiveCheck;
    }
  }
}

/**
 * Maps a Prisma fund category enum to the domain category value.
 *
 * @param category - Prisma fund category enum.
 * @returns Domain category value.
 */
export function mapPrismaFundCategory(
  category: PrismaFundCategory,
): FundCategory {
  switch (category) {
    case PrismaFundCategory.INDEX:
      return 'index';
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
 * Maps persisted metric columns to the domain metrics object.
 *
 * @param record - Persisted Prisma fund row.
 * @returns Validated calculated fund metrics.
 */
export function mapPrismaFundMetrics(record: PrismaFund): FundMetrics {
  return {
    volatility: mapNullableDecimal(record.volatility),
    drawdown: mapNullableDecimal(record.drawdown),
    ter: mapNullableDecimal(record.ter),
    aum: mapNullableDecimal(record.aum),
    per: mapNullableDecimal(record.per),
    dividendYield: mapNullableDecimal(record.dividendYield),
    trackingError: mapNullableDecimal(record.trackingError),
  };
}

/**
 * Maps a Prisma fund record to the Invesora domain entity.
 *
 * @param record - Persisted Prisma fund row.
 * @returns Validated Invesora fund entity.
 */
export function mapPrismaFundToFund(record: PrismaFund): Fund {
  return fundSchema.parse({
    id: record.id,
    symbol: record.symbol,
    isin: record.isin,
    name: record.name,
    provider: mapPrismaFundProvider(record.provider),
    category: mapPrismaFundCategory(record.category),
    currency: record.currency,
    benchmark: record.benchmark,
    metrics: mapPrismaFundMetrics(record),
    riskLevel: record.riskLevel,
    score: mapNullableDecimal(record.score),
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
  });
}
