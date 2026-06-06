import {
  FundCategory as PrismaFundCategory,
  FundProvider as PrismaFundProvider,
  type Fund as PrismaFund,
} from '@prisma/client';
import { fundSchema } from './fund.schema';
import type { Fund, FundCategory, FundProvider } from './fund.schema';

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
    expenseRatio:
      record.expenseRatio === null ? null : record.expenseRatio.toNumber(),
    riskLevel: record.riskLevel,
    score: record.score === null ? null : record.score.toNumber(),
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
  });
}
