import { z } from 'zod';

/** Zod schema for a normalized index fund search result. */
export const indexFundSearchResultSchema = z.object({
  symbol: z.string(),
  name: z.string(),
  currency: z.string().optional(),
  exchange: z.string().optional(),
  exchangeFullName: z.string().optional(),
});

/** Inferred type for a normalized index fund search result. */
export type IndexFundSearchResult = z.infer<typeof indexFundSearchResultSchema>;

/** Zod schema for a normalized index fund profile. */
export const indexFundProfileSchema = z.object({
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

/** Inferred type for a normalized index fund profile. */
export type IndexFundProfile = z.infer<typeof indexFundProfileSchema>;

/** Zod schema for a normalized historical price point. */
export const indexFundHistoricalPriceSchema = z.object({
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

/** Inferred type for a normalized historical price point. */
export type IndexFundHistoricalPrice = z.infer<
  typeof indexFundHistoricalPriceSchema
>;

/** Zod schema for derived price statistics over a historical window. */
export const indexFundPriceSummarySchema = z.object({
  latestDate: z.string(),
  latestClose: z.number(),
  periodStartDate: z.string(),
  periodStartClose: z.number(),
  periodReturnPercent: z.number(),
  periodHigh: z.number(),
  periodLow: z.number(),
  averageVolume: z.number().optional(),
});

/** Inferred type for derived price statistics. */
export type IndexFundPriceSummary = z.infer<typeof indexFundPriceSummarySchema>;

/** Zod schema for an index fund detail aggregate. */
export const indexFundDetailSchema = indexFundProfileSchema.extend({
  priceSummary: indexFundPriceSummarySchema,
  history: z.array(indexFundHistoricalPriceSchema).optional(),
});

/** Inferred type for an index fund detail aggregate. */
export type IndexFundDetail = z.infer<typeof indexFundDetailSchema>;

/** Zod schema for a normalized index fund holding. */
export const indexFundHoldingSchema = z.object({
  asset: z.string().optional(),
  name: z.string().min(1),
  isin: z.string().optional(),
  weightPercentage: z.number().nonnegative(),
  marketValue: z.number().nonnegative().optional(),
  sharesNumber: z.number().nonnegative().optional(),
});

/** Inferred type for a normalized index fund holding. */
export type IndexFundHolding = z.infer<typeof indexFundHoldingSchema>;
