import { z } from 'zod';

/** Zod schema for an FMP-normalized index fund search result. */
export const fmpIndexFundSearchResultSchema = z.object({
  symbol: z.string(),
  name: z.string(),
  currency: z.string().optional(),
  exchange: z.string().optional(),
  exchangeFullName: z.string().optional(),
});

/** Inferred type for an FMP-normalized index fund search result. */
export type FmpIndexFundSearchResult = z.infer<
  typeof fmpIndexFundSearchResultSchema
>;

/** Zod schema for an FMP-normalized index fund profile. */
export const fmpIndexFundProfileSchema = z.object({
  symbol: z.string(),
  name: z.string(),
  description: z.string().optional(),
  expenseRatio: z.number().optional(),
  assetsUnderManagement: z.number().optional(),
  nav: z.number().optional(),
  navCurrency: z.string().optional(),
  holdingsCount: z.number().optional(),
  inceptionDate: z.string().optional(),
  issuer: z.string().optional(),
  assetClass: z.string().optional(),
  domicile: z.string().optional(),
  currency: z.string().optional(),
  exchange: z.string().optional(),
  exchangeFullName: z.string().optional(),
  benchmark: z.string().optional(),
});

/** Inferred type for an FMP-normalized index fund profile. */
export type FmpIndexFundProfile = z.infer<typeof fmpIndexFundProfileSchema>;

/** Zod schema for an FMP-normalized historical price point. */
export const fmpIndexFundHistoricalPriceSchema = z.object({
  date: z.string(),
  open: z.number(),
  high: z.number(),
  low: z.number(),
  close: z.number(),
  volume: z.number().optional(),
  change: z.number().optional(),
  changePercent: z.number().optional(),
  vwap: z.number().optional(),
});

/** Inferred type for an FMP-normalized historical price point. */
export type FmpIndexFundHistoricalPrice = z.infer<
  typeof fmpIndexFundHistoricalPriceSchema
>;

/** Zod schema for FMP-derived price statistics over a historical window. */
export const fmpIndexFundPriceSummarySchema = z.object({
  latestDate: z.string(),
  latestClose: z.number(),
  periodStartDate: z.string(),
  periodStartClose: z.number(),
  periodReturnPercent: z.number(),
  periodHigh: z.number(),
  periodLow: z.number(),
  averageVolume: z.number().optional(),
});

/** Inferred type for FMP-derived price statistics. */
export type FmpIndexFundPriceSummary = z.infer<
  typeof fmpIndexFundPriceSummarySchema
>;

/** Zod schema for an FMP index fund detail aggregate. */
export const fmpIndexFundDetailSchema = fmpIndexFundProfileSchema.extend({
  priceSummary: fmpIndexFundPriceSummarySchema,
  history: z.array(fmpIndexFundHistoricalPriceSchema).optional(),
});

/** Inferred type for an FMP index fund detail aggregate. */
export type FmpIndexFundDetail = z.infer<typeof fmpIndexFundDetailSchema>;
