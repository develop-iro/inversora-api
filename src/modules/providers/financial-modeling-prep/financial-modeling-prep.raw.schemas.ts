import { z } from 'zod';

/** Zod schema for FMP stable search-symbol and search-name results. */
export const fmpSearchResultSchema = z
  .object({
    symbol: z.string(),
    name: z.string(),
    currency: z.string().optional(),
    stockExchange: z.string().optional(),
    exchangeShortName: z.string().optional(),
    exchangeFullName: z.string().optional(),
    exchange: z.string().optional(),
  })
  .passthrough();

/** Inferred type for a raw FMP search result. */
export type FmpSearchResult = z.infer<typeof fmpSearchResultSchema>;

/** Zod schema for ETF and mutual fund profile data returned by FMP. */
export const fmpFundProfileSchema = z
  .object({
    symbol: z.string(),
    name: z.string().optional(),
    description: z.string().optional(),
    isin: z.string().optional(),
    assetClass: z.string().optional(),
    domicile: z.string().optional(),
    expenseRatio: z.coerce.number().optional(),
    assetsUnderManagement: z.coerce.number().optional(),
    nav: z.coerce.number().optional(),
    navCurrency: z.string().optional(),
    holdingsCount: z.coerce.number().optional(),
    inceptionDate: z.string().optional(),
    etfCompany: z.string().optional(),
    sectorsList: z.array(z.record(z.string(), z.unknown())).optional(),
  })
  .passthrough();

/** Inferred type for a raw FMP fund profile. */
export type FmpFundProfile = z.infer<typeof fmpFundProfileSchema>;

/** Zod schema for a single raw end-of-day historical price point. */
export const fmpHistoricalPriceSchema = z
  .object({
    symbol: z.string().optional(),
    date: z.string(),
    open: z.coerce.number(),
    high: z.coerce.number(),
    low: z.coerce.number(),
    close: z.coerce.number(),
    volume: z.coerce.number().optional(),
    change: z.coerce.number().optional(),
    changePercent: z.coerce.number().optional(),
    vwap: z.coerce.number().optional(),
  })
  .passthrough();

/** Inferred type for a raw historical price point. */
export type FmpHistoricalPrice = z.infer<typeof fmpHistoricalPriceSchema>;

/** Zod schema for a raw fund holding returned by FMP. */
export const fmpFundHoldingSchema = z
  .object({
    asset: z.string().optional(),
    name: z.string().optional(),
    isin: z.string().optional(),
    cusip: z.string().optional(),
    sharesNumber: z.coerce.number().optional(),
    weightPercentage: z.coerce.number().optional(),
    marketValue: z.coerce.number().optional(),
    updated: z.string().optional(),
  })
  .passthrough();

/** Inferred type for a raw fund holding. */
export type FmpFundHolding = z.infer<typeof fmpFundHoldingSchema>;
