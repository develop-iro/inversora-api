import { z } from 'zod';
import { fundVehicleTypeSchema } from '../../funds/entities/fund.schema';

/** Zod schema for a normalized provider fund search result. */
export const providerFundSearchResultSchema = z.object({
  symbol: z.string(),
  name: z.string(),
  vehicle: fundVehicleTypeSchema,
  currency: z.string().optional(),
  exchange: z.string().optional(),
  exchangeFullName: z.string().optional(),
});

/** Inferred type for a normalized provider fund search result. */
export type ProviderFundSearchResult = z.infer<
  typeof providerFundSearchResultSchema
>;

/** Zod schema for a normalized provider fund profile. */
export const providerFundProfileSchema = z.object({
  symbol: z.string(),
  name: z.string(),
  vehicle: fundVehicleTypeSchema,
  isin: z.string().optional(),
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

/** Inferred type for a normalized provider fund profile. */
export type ProviderFundProfile = z.infer<typeof providerFundProfileSchema>;

/** Zod schema for a normalized historical price point. */
export const providerFundHistoricalPriceSchema = z.object({
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
export type ProviderFundHistoricalPrice = z.infer<
  typeof providerFundHistoricalPriceSchema
>;

/** Zod schema for derived price statistics over a historical window. */
export const providerFundPriceSummarySchema = z.object({
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
export type ProviderFundPriceSummary = z.infer<
  typeof providerFundPriceSummarySchema
>;

/** Zod schema for a normalized live or delayed quote snapshot from FMP. */
export const providerFundQuoteSchema = z.object({
  symbol: z.string(),
  price: z.number(),
  changePercent: z.number().nullable(),
  volume: z.number().nullable(),
  asOf: z.string().datetime(),
});

/** Inferred type for a normalized provider quote snapshot. */
export type ProviderFundQuote = z.infer<typeof providerFundQuoteSchema>;

/** Zod schema for a provider fund detail aggregate. */
export const providerFundDetailSchema = providerFundProfileSchema.extend({
  priceSummary: providerFundPriceSummarySchema,
  history: z.array(providerFundHistoricalPriceSchema).optional(),
});

/** Inferred type for a provider fund detail aggregate. */
export type ProviderFundDetail = z.infer<typeof providerFundDetailSchema>;

/** Zod schema for a normalized fund holding row from the provider. */
export const providerFundHoldingSchema = z.object({
  asset: z.string().optional(),
  name: z.string().min(1),
  isin: z.string().optional(),
  weightPercentage: z.number().nonnegative(),
  marketValue: z.number().nonnegative().optional(),
  sharesNumber: z.number().nonnegative().optional(),
});

/** Inferred type for a normalized fund holding row from the provider. */
export type ProviderFundHolding = z.infer<typeof providerFundHoldingSchema>;

/** Zod schema for a normalized sector weighting row from the provider. */
export const providerFundSectorWeightingSchema = z.object({
  sector: z.string().min(1),
  weightPercentage: z.number().nonnegative(),
});

/** Inferred type for a normalized sector weighting row from the provider. */
export type ProviderFundSectorWeighting = z.infer<
  typeof providerFundSectorWeightingSchema
>;

/** Zod schema for a normalized country weighting row from the provider. */
export const providerFundCountryWeightingSchema = z.object({
  country: z.string().min(1),
  weightPercentage: z.number().nonnegative(),
});

/** Inferred type for a normalized country weighting row from the provider. */
export type ProviderFundCountryWeighting = z.infer<
  typeof providerFundCountryWeightingSchema
>;

/** Zod schema for a normalized market news article from the provider. */
export const providerNewsArticleSchema = z.object({
  title: z.string().min(1),
  summary: z.string().min(1),
  source: z.string().min(1),
  publishedAt: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  url: z.string().url(),
});

/** Inferred type for a normalized market news article from the provider. */
export type ProviderNewsArticle = z.infer<typeof providerNewsArticleSchema>;

/** Zod schema for a normalized provider fund composition snapshot. */
export const providerFundCompositionSchema = z.object({
  asOf: z.string(),
  holdings: z.array(providerFundHoldingSchema),
  sectorWeightings: z.array(providerFundSectorWeightingSchema),
  countryWeightings: z.array(providerFundCountryWeightingSchema),
});

/** Inferred type for a normalized provider fund composition snapshot. */
export type ProviderFundComposition = z.infer<
  typeof providerFundCompositionSchema
>;
