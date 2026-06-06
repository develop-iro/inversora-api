import { z } from 'zod';

/** Supported index fund classification inside Invesora. */
export const invesoraFundTypeSchema = z.literal('index');

/** Inferred type for supported fund classifications. */
export type InvesoraFundType = z.infer<typeof invesoraFundTypeSchema>;

/** Zod schema for a fund listing in search responses. */
export const invesoraFundListingSchema = z.object({
  symbol: z.string(),
  name: z.string(),
  fundType: invesoraFundTypeSchema,
  currency: z.string().optional(),
  exchangeCode: z.string().optional(),
  exchangeName: z.string().optional(),
});

/** Inferred type for a fund listing. */
export type InvesoraFundListing = z.infer<typeof invesoraFundListingSchema>;

/** Zod schema for quantitative fund metrics. */
export const invesoraFundMetricsSchema = z.object({
  expenseRatio: z.number().optional(),
  assetsUnderManagement: z.number().optional(),
  netAssetValue: z.number().optional(),
  netAssetValueCurrency: z.string().optional(),
  holdingsCount: z.number().optional(),
  inceptionDate: z.string().optional(),
});

/** Inferred type for quantitative fund metrics. */
export type InvesoraFundMetrics = z.infer<typeof invesoraFundMetricsSchema>;

/** Zod schema for the static identity of a fund. */
export const invesoraFundIdentitySchema = z.object({
  symbol: z.string(),
  name: z.string(),
  fundType: invesoraFundTypeSchema,
  description: z.string().optional(),
  issuer: z.string().optional(),
  benchmark: z.string().optional(),
  assetClass: z.string().optional(),
  domicile: z.string().optional(),
  currency: z.string().optional(),
  exchangeCode: z.string().optional(),
  exchangeName: z.string().optional(),
});

/** Inferred type for fund identity data. */
export type InvesoraFundIdentity = z.infer<typeof invesoraFundIdentitySchema>;

/** Zod schema for a complete fund profile. */
export const invesoraFundProfileSchema = invesoraFundIdentitySchema.extend({
  metrics: invesoraFundMetricsSchema,
});

/** Inferred type for a fund profile. */
export type InvesoraFundProfile = z.infer<typeof invesoraFundProfileSchema>;

/** Zod schema for a single end-of-day price point. */
export const invesoraFundPricePointSchema = z.object({
  date: z.string(),
  open: z.number(),
  high: z.number(),
  low: z.number(),
  close: z.number(),
  volume: z.number().optional(),
  dailyChange: z.number().optional(),
  dailyChangePercent: z.number().optional(),
  vwap: z.number().optional(),
});

/** Inferred type for a price point. */
export type InvesoraFundPricePoint = z.infer<typeof invesoraFundPricePointSchema>;

/** Zod schema for derived performance metrics over a date window. */
export const invesoraFundPerformanceSummarySchema = z.object({
  asOfDate: z.string(),
  latestClose: z.number(),
  periodStartDate: z.string(),
  periodStartClose: z.number(),
  periodReturnPercent: z.number(),
  periodHigh: z.number(),
  periodLow: z.number(),
  averageVolume: z.number().optional(),
});

/** Inferred type for derived performance metrics. */
export type InvesoraFundPerformanceSummary = z.infer<
  typeof invesoraFundPerformanceSummarySchema
>;

/** Zod schema for a fund detail aggregate exposed by Invesora. */
export const invesoraFundDetailSchema = invesoraFundProfileSchema.extend({
  performance: invesoraFundPerformanceSummarySchema,
  priceHistory: z.array(invesoraFundPricePointSchema).optional(),
});

/** Inferred type for a fund detail aggregate. */
export type InvesoraFundDetail = z.infer<typeof invesoraFundDetailSchema>;

/** Zod schema for a fund search response. */
export const invesoraFundSearchResponseSchema = z.object({
  items: z.array(invesoraFundListingSchema),
  source: z.literal('financial-modeling-prep'),
});

/** Inferred type for a fund search response. */
export type InvesoraFundSearchResponse = z.infer<
  typeof invesoraFundSearchResponseSchema
>;
