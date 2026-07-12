import { z } from 'zod';

const nullableNumber = z.number().nullable().optional();
const nullableString = z.string().nullable().optional();

/** Zod schema for a raw named percentage row (sectors, regions, fees). */
export const myInvestorNamedPctSchema = z
  .object({
    name: z.string(),
    pct: z.number().nullable().optional(),
  })
  .passthrough();

/** Inferred type for a raw named percentage row. */
export type MyInvestorNamedPct = z.infer<typeof myInvestorNamedPctSchema>;

/**
 * Zod schema for a raw MyInvestor fund row from the MCP `structuredContent`.
 *
 * Only the fields that Inversora consumes are declared; unknown fields pass
 * through untouched so upstream additions never break parsing.
 */
export const myInvestorFundSchema = z
  .object({
    isin: z.string().min(1),
    name: z.string().min(1),
    product_type: nullableString,
    asset_class: nullableString,
    category: nullableString,
    category_morningstar: nullableString,
    geographic_zone: nullableString,
    management_company: nullableString,
    status: nullableString,
    ter: nullableNumber,
    risk_indicator: nullableNumber,
    mstar_rating: nullableNumber,
    volatility_1y: nullableNumber,
    volatility_3y: nullableNumber,
    volatility_5y: nullableNumber,
    tracking_error_1y: nullableNumber,
    ytd: nullableNumber,
    return_1y: nullableNumber,
    return_3y: nullableNumber,
    return_5y: nullableNumber,
    aum: nullableNumber,
    nav: nullableNumber,
    nav_date: nullableString,
    inception_date: nullableString,
    alloc_equity: nullableNumber,
    alloc_bond: nullableNumber,
    alloc_cash: nullableNumber,
    alloc_other: nullableNumber,
    currency: nullableString,
    distributing: nullableNumber,
    esg: nullableNumber,
    min_initial: nullableString,
    description: nullableString,
    url_kiid: nullableString,
    top_sectors: z.array(myInvestorNamedPctSchema).nullable().optional(),
    top_regions: z.array(myInvestorNamedPctSchema).nullable().optional(),
    fees: z.array(myInvestorNamedPctSchema).nullable().optional(),
  })
  .passthrough();

/** Inferred type for a raw MyInvestor fund row. */
export type MyInvestorFund = z.infer<typeof myInvestorFundSchema>;

/** Zod schema for the `get_funds` structured payload. */
export const myInvestorGetFundsPayloadSchema = z
  .object({
    data: z
      .object({
        funds: z.array(myInvestorFundSchema),
      })
      .passthrough(),
  })
  .passthrough();

/** Zod schema for the `search_funds` structured payload. */
export const myInvestorSearchFundsPayloadSchema = z
  .object({
    data: z
      .object({
        total_found: z.number().optional(),
        funds: z.array(myInvestorFundSchema),
      })
      .passthrough(),
  })
  .passthrough();

/** Inferred type for the `search_funds` structured payload. */
export type MyInvestorSearchFundsPayload = z.infer<
  typeof myInvestorSearchFundsPayloadSchema
>;
