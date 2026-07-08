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
