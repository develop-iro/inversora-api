import type { FundApi } from './fund-api.schema';
import type { FundListSortField, FundListSortOrder } from './fund-list.schema';

/**
 * Extracts the return value used for return-based sorting.
 *
 * @param fund - Enriched fund API payload.
 * @param sortBy - Return sort field.
 */
function getReturnSortValue(
  fund: FundApi,
  sortBy: Extract<FundListSortField, 'return1y' | 'return3y'>,
): number | null {
  return sortBy === 'return1y' ? fund.returns.oneYear : fund.returns.threeYear;
}

/**
 * Sorts enriched fund payloads by historical return snapshots.
 *
 * @param funds - Funds with populated `returns`.
 * @param sortBy - Return sort field.
 * @param sortOrder - Sort direction.
 */
type MinReturnFilterOptions = {
  readonly minReturn1y?: number;
  readonly minReturn3y?: number;
};

/**
 * Filters enriched funds by minimum historical return thresholds.
 *
 * Funds with null returns for a filtered period are excluded.
 *
 * @param funds - Funds with populated `returns`.
 * @param options - Minimum return thresholds.
 */
export function filterEnrichedFundsByMinReturn(
  funds: readonly FundApi[],
  options: MinReturnFilterOptions,
): FundApi[] {
  const { minReturn1y, minReturn3y } = options;

  if (minReturn1y === undefined && minReturn3y === undefined) {
    return [...funds];
  }

  return funds.filter((fund) => {
    if (minReturn1y !== undefined) {
      const oneYear = fund.returns.oneYear;

      if (oneYear === null || oneYear < minReturn1y) {
        return false;
      }
    }

    if (minReturn3y !== undefined) {
      const threeYear = fund.returns.threeYear;

      if (threeYear === null || threeYear < minReturn3y) {
        return false;
      }
    }

    return true;
  });
}

/**
 * Sorts enriched fund payloads by a Prisma-backed catalog field.
 *
 * @param funds - Enriched fund payloads.
 * @param sortBy - Non-return sort field.
 * @param sortOrder - Sort direction.
 */
export function sortEnrichedFundsByCatalogField(
  funds: readonly FundApi[],
  sortBy: Exclude<FundListSortField, 'return1y' | 'return3y'>,
  sortOrder: FundListSortOrder,
): FundApi[] {
  const direction = sortOrder === 'asc' ? 1 : -1;

  return [...funds].sort((left, right) => {
    const leftValue = readCatalogSortValue(left, sortBy);
    const rightValue = readCatalogSortValue(right, sortBy);

    if (leftValue === null && rightValue === null) {
      return left.name.localeCompare(right.name, 'es');
    }

    if (leftValue === null) {
      return 1;
    }

    if (rightValue === null) {
      return -1;
    }

    if (typeof leftValue === 'string' && typeof rightValue === 'string') {
      const diff = leftValue.localeCompare(rightValue, 'es');

      if (diff === 0) {
        return left.name.localeCompare(right.name, 'es');
      }

      return diff * direction;
    }

    const diff = Number(leftValue) - Number(rightValue);

    if (diff === 0) {
      return left.name.localeCompare(right.name, 'es');
    }

    return diff * direction;
  });
}

function readCatalogSortValue(
  fund: FundApi,
  sortBy: Exclude<FundListSortField, 'return1y' | 'return3y'>,
): string | number | null {
  switch (sortBy) {
    case 'symbol':
      return fund.symbol;
    case 'name':
      return fund.name;
    case 'score':
      return fund.score;
    case 'ter':
      return fund.metrics.ter;
    case 'aum':
      return fund.metrics.aum;
    case 'riskLevel':
      return fund.riskLevel;
    case 'currency':
      return fund.currency;
    case 'createdAt':
      return fund.createdAt instanceof Date
        ? fund.createdAt.getTime()
        : new Date(fund.createdAt).getTime();
    case 'updatedAt':
      return fund.updatedAt instanceof Date
        ? fund.updatedAt.getTime()
        : new Date(fund.updatedAt).getTime();
    default: {
      const _exhaustive: never = sortBy;
      return _exhaustive;
    }
  }
}

export function sortEnrichedFundsByReturn(
  funds: readonly FundApi[],
  sortBy: Extract<FundListSortField, 'return1y' | 'return3y'>,
  sortOrder: FundListSortOrder,
): FundApi[] {
  const direction = sortOrder === 'asc' ? 1 : -1;

  return [...funds].sort((left, right) => {
    const leftValue = getReturnSortValue(left, sortBy);
    const rightValue = getReturnSortValue(right, sortBy);

    if (leftValue === null && rightValue === null) {
      return left.name.localeCompare(right.name, 'es');
    }

    if (leftValue === null) {
      return 1;
    }

    if (rightValue === null) {
      return -1;
    }

    const diff = leftValue - rightValue;

    if (diff === 0) {
      return left.name.localeCompare(right.name, 'es');
    }

    return diff * direction;
  });
}
