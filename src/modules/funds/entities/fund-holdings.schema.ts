import { z } from 'zod';
import { fundPriceDateSchema } from './fund-price.schema';
import { fundHoldingSchema } from './fund-composition.schema';

/** Query schema for `GET /funds/:id/holdings`. */
export const fundHoldingsQuerySchema = z.object({
  asOf: fundPriceDateSchema.optional(),
});

/** Parsed query type for `GET /funds/:id/holdings`. */
export type FundHoldingsQuery = z.infer<typeof fundHoldingsQuerySchema>;

/** Holding row exposed by the fund holdings endpoint. */
export const fundHoldingsItemSchema = fundHoldingSchema.omit({
  fundId: true,
  asOf: true,
  createdAt: true,
  updatedAt: true,
});

/** Inferred type for a fund holdings response item. */
export type FundHoldingsItem = z.infer<typeof fundHoldingsItemSchema>;

/** Response schema for `GET /funds/:id/holdings`. */
export const fundHoldingsResponseSchema = z.object({
  fundId: z.uuid(),
  asOf: fundPriceDateSchema.nullable(),
  holdings: z.array(fundHoldingsItemSchema),
});

/** Response type for `GET /funds/:id/holdings`. */
export type FundHoldingsResponse = z.infer<typeof fundHoldingsResponseSchema>;
