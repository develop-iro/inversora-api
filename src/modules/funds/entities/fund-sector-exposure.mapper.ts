import type { FundAllocation } from './fund-composition.schema';
import {
  fundSectorExposureResponseSchema,
  type FundSectorExposureResponse,
} from './fund-sector-exposure.schema';

/**
 * Maps persisted sector allocations to the public exposure response shape.
 *
 * @param fundId - Persisted fund identifier.
 * @param asOf - Snapshot date when allocations exist.
 * @param allocations - Sector allocations ordered by sort order ascending.
 * @returns Validated sector exposure response.
 */
export function buildFundSectorExposureResponse(
  fundId: string,
  asOf: string | null,
  allocations: readonly FundAllocation[],
): FundSectorExposureResponse {
  return fundSectorExposureResponseSchema.parse({
    fundId,
    asOf,
    sectors: allocations.map((allocation) => ({
      id: allocation.id,
      label: allocation.label,
      weight: allocation.weight,
      sortOrder: allocation.sortOrder,
    })),
  });
}
