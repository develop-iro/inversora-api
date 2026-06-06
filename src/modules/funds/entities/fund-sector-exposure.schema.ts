import { z } from 'zod';
import { fundPriceDateSchema } from './fund-price.schema';
import { fundAllocationSchema } from './fund-composition.schema';

/** Allocation category used for sector-level exposure. */
export const FUND_SECTOR_EXPOSURE_CATEGORY = 'sectorial' as const;

/** Exposure slice exposed by sector exposure endpoints. */
export const fundSectorExposureItemSchema = fundAllocationSchema.omit({
  fundId: true,
  asOf: true,
  category: true,
  createdAt: true,
  updatedAt: true,
});

/** Inferred type for a sector exposure response item. */
export type FundSectorExposureItem = z.infer<
  typeof fundSectorExposureItemSchema
>;

/** Response schema for `GET /funds/:id/exposure/sectors`. */
export const fundSectorExposureResponseSchema = z.object({
  fundId: z.uuid(),
  asOf: fundPriceDateSchema.nullable(),
  sectors: z.array(fundSectorExposureItemSchema),
});

/** Response type for `GET /funds/:id/exposure/sectors`. */
export type FundSectorExposureResponse = z.infer<
  typeof fundSectorExposureResponseSchema
>;
