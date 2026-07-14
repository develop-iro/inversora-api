import type { Prisma } from '@prisma/client';
import {
  mapDomainFundCategoryToPrisma,
  mapDomainFundProviderToPrisma,
  mapDomainFundVehicleToPrisma,
  mapDomainCatalogVisibilityToPrisma,
  mapDomainInvestmentThemeToPrisma,
} from './fund.mapper';
import { CatalogVisibility as PrismaCatalogVisibility } from '@prisma/client';
import type {
  FundListFilterQuery,
  FundListSortField,
  FundListSortOrder,
} from './fund-list.schema';
import type { CatalogVisibility } from './catalog-visibility.schema';
import { buildRiskProfileWhereInput } from './fund-risk-profile.mapper';

export type PrismaFundListSortField = FundListSortField;

type PrismaBackedFundListSortField = Exclude<
  FundListSortField,
  'return1y' | 'return3y'
>;

const SORT_FIELD_TO_PRISMA_COLUMN: Record<
  PrismaBackedFundListSortField,
  keyof Prisma.FundOrderByWithRelationInput
> = {
  symbol: 'symbol',
  name: 'name',
  score: 'score',
  ter: 'ter',
  aum: 'aum',
  riskLevel: 'riskLevel',
  currency: 'currency',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt',
};

const RETURN_SORT_FIELD_TO_PRISMA_COLUMN: Record<
  'return1y' | 'return3y',
  keyof Prisma.FundOrderByWithRelationInput
> = {
  return1y: 'return1y',
  return3y: 'return3y',
};

/**
 * Builds the default public catalog visibility filter.
 *
 * Matches {@link isCatalogVisible}: visible funds plus quarantined funds with
 * complete catalog metadata.
 */
export function buildPublicCatalogVisibilityWhereInput(): Prisma.FundWhereInput {
  return {
    OR: [
      { catalogVisibility: PrismaCatalogVisibility.VISIBLE },
      {
        AND: [
          { catalogVisibility: PrismaCatalogVisibility.QUARANTINED },
          { isin: { not: null } },
          { NOT: { isin: '' } },
          { benchmark: { not: null } },
          { NOT: { benchmark: '' } },
          { ter: { not: null } },
          { NOT: { name: '' } },
        ],
      },
    ],
  };
}

/**
 * Builds a Prisma filter from validated fund list query parameters.
 *
 * @param query - Validated list query.
 * @param options - Optional visibility scope for public vs admin listings.
 * @returns Prisma where input.
 */
export function buildFundListWhereInput(
  query: FundListFilterQuery,
  options: {
    catalogVisibility?: readonly CatalogVisibility[];
  } = {},
): Prisma.FundWhereInput {
  const conditions: Prisma.FundWhereInput[] = [];

  if (options.catalogVisibility === undefined) {
    conditions.push(buildPublicCatalogVisibilityWhereInput());
  } else {
    conditions.push({
      catalogVisibility: {
        in: options.catalogVisibility.map(mapDomainCatalogVisibilityToPrisma),
      },
    });
  }

  if (query.q !== undefined) {
    conditions.push({
      OR: [
        { symbol: { contains: query.q, mode: 'insensitive' } },
        { name: { contains: query.q, mode: 'insensitive' } },
        { isin: { contains: query.q.toUpperCase(), mode: 'insensitive' } },
        { benchmark: { contains: query.q, mode: 'insensitive' } },
      ],
    });
  }

  if (query.category !== undefined) {
    conditions.push({
      category: mapDomainFundCategoryToPrisma(query.category),
    });
  }

  if (query.vehicle !== undefined) {
    conditions.push({
      vehicle: mapDomainFundVehicleToPrisma(query.vehicle),
    });
  }

  if (query.currency !== undefined) {
    conditions.push({ currency: query.currency });
  }

  if (query.provider !== undefined) {
    conditions.push({
      provider: mapDomainFundProviderToPrisma(query.provider),
    });
  }

  if (query.benchmark !== undefined) {
    conditions.push({
      benchmark: { contains: query.benchmark, mode: 'insensitive' },
    });
  }

  if (query.riskProfile !== undefined && query.riskProfile !== 'all') {
    const riskWhere = buildRiskProfileWhereInput(query.riskProfile);

    if (riskWhere !== null) {
      conditions.push(riskWhere);
    }
  } else if (query.riskLevel !== undefined) {
    conditions.push({ riskLevel: query.riskLevel });
  }

  const effectiveMinScore =
    query.idealForBeginnersOnly === true
      ? Math.max(query.minScore ?? 0, 30)
      : query.minScore;

  if (effectiveMinScore !== undefined || query.maxScore !== undefined) {
    conditions.push({
      score: {
        ...(effectiveMinScore !== undefined ? { gte: effectiveMinScore } : {}),
        ...(query.maxScore !== undefined ? { lte: query.maxScore } : {}),
      },
    });
  }

  if (query.minTer !== undefined || query.maxTer !== undefined) {
    conditions.push({
      ter: {
        ...(query.minTer !== undefined ? { gte: query.minTer } : {}),
        ...(query.maxTer !== undefined ? { lte: query.maxTer } : {}),
      },
    });
  }

  if (query.minReturn1y !== undefined) {
    conditions.push({
      return1y: { gte: query.minReturn1y },
    });
  }

  if (query.minReturn3y !== undefined) {
    conditions.push({
      return3y: { gte: query.minReturn3y },
    });
  }

  if (query.idealForBeginnersOnly !== undefined) {
    conditions.push({
      idealForBeginners: query.idealForBeginnersOnly,
    });
  }

  if (query.investmentTheme !== undefined) {
    conditions.push({
      investmentTheme: mapDomainInvestmentThemeToPrisma(query.investmentTheme),
    });
  }

  return conditions.length > 0 ? { AND: conditions } : {};
}

/** Maximum funds considered when sorting by enriched return snapshots (MVP). */
export const RETURN_BASED_SORT_MAX_FUNDS = 500;

/**
 * Returns true when sorting must happen after return enrichment.
 *
 * @param sortBy - Requested sort field.
 */
export function isReturnBasedSortField(
  sortBy: FundListSortField,
): sortBy is 'return1y' | 'return3y' {
  return sortBy === 'return1y' || sortBy === 'return3y';
}

/**
 * @deprecated Return sorts and filters use materialized SQL columns.
 */
export function requiresReturnEnrichment(): boolean {
  return false;
}

/**
 * Builds a Prisma order clause from validated sort options.
 *
 * @param sortBy - Sort field.
 * @param sortOrder - Sort direction.
 * @returns Prisma order-by input.
 */
export function buildFundListOrderByInput(
  sortBy: FundListSortField,
  sortOrder: FundListSortOrder,
): Prisma.FundOrderByWithRelationInput {
  if (isReturnBasedSortField(sortBy)) {
    const field = RETURN_SORT_FIELD_TO_PRISMA_COLUMN[sortBy];

    return {
      [field]: sortOrder,
    };
  }

  const field = SORT_FIELD_TO_PRISMA_COLUMN[sortBy];

  return {
    [field]: sortOrder,
  };
}

/**
 * Calculates pagination metadata for a list response.
 *
 * @param page - Current page number.
 * @param limit - Page size.
 * @param total - Total matching rows.
 * @returns Pagination metadata.
 */
export function buildFundListMeta(
  page: number,
  limit: number,
  total: number,
): {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
} {
  return {
    page,
    limit,
    total,
    totalPages: total === 0 ? 0 : Math.ceil(total / limit),
  };
}
