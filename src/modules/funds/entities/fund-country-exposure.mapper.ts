import type { FundAllocation } from './fund-composition.schema';
import {
  fundCountryExposureResponseSchema,
  type FundCountryExposureResponse,
} from './fund-country-exposure.schema';

/**
 * Maps persisted country allocations to the public exposure response shape.
 *
 * @param fundId - Persisted fund identifier.
 * @param asOf - Snapshot date when allocations exist.
 * @param allocations - Country allocations ordered by sort order ascending.
 * @returns Validated country exposure response.
 */
export function buildFundCountryExposureResponse(
  fundId: string,
  asOf: string | null,
  allocations: readonly FundAllocation[],
): FundCountryExposureResponse {
  return fundCountryExposureResponseSchema.parse({
    fundId,
    asOf,
    countries: allocations.map((allocation) => ({
      id: allocation.id,
      label: allocation.label,
      weight: allocation.weight,
      sortOrder: allocation.sortOrder,
    })),
  });
}
