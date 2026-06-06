import { z } from 'zod';
import { fundPriceDateSchema } from './fund-price.schema';
import { fundAllocationSchema } from './fund-composition.schema';

/** Allocation category used for country-level geographic exposure. */
export const FUND_COUNTRY_EXPOSURE_CATEGORY = 'countries' as const;

/** Shared query schema for fund exposure read endpoints. */
export const fundExposureQuerySchema = z.object({
  asOf: fundPriceDateSchema.optional(),
});

/** Parsed query type for fund exposure read endpoints. */
export type FundExposureQuery = z.infer<typeof fundExposureQuerySchema>;

/** Exposure slice exposed by country exposure endpoints. */
export const fundCountryExposureItemSchema = fundAllocationSchema.omit({
  fundId: true,
  asOf: true,
  category: true,
  createdAt: true,
  updatedAt: true,
});

/** Inferred type for a country exposure response item. */
export type FundCountryExposureItem = z.infer<
  typeof fundCountryExposureItemSchema
>;

/** Response schema for `GET /funds/:id/exposure/countries`. */
export const fundCountryExposureResponseSchema = z.object({
  fundId: z.uuid(),
  asOf: fundPriceDateSchema.nullable(),
  countries: z.array(fundCountryExposureItemSchema),
});

/** Response type for `GET /funds/:id/exposure/countries`. */
export type FundCountryExposureResponse = z.infer<
  typeof fundCountryExposureResponseSchema
>;
