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

/** Zod schema for rows returned by FMP `etf-list`. */
export const fmpEtfListEntrySchema = z
  .object({
    symbol: z.string(),
    name: z.string(),
  })
  .passthrough();

/** Inferred type for a raw FMP ETF list row. */
export type FmpEtfListEntry = z.infer<typeof fmpEtfListEntrySchema>;

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

/** Zod schema for a raw ETF sector weighting returned by FMP. */
export const fmpSectorWeightingSchema = z
  .object({
    symbol: z.string().optional(),
    sector: z.string(),
    weightPercentage: z.coerce.number().optional(),
    weight: z.coerce.number().optional(),
  })
  .passthrough();

/** Inferred type for a raw ETF sector weighting. */
export type FmpSectorWeighting = z.infer<typeof fmpSectorWeightingSchema>;

/** Zod schema for a raw ETF country weighting returned by FMP. */
export const fmpCountryWeightingSchema = z
  .object({
    country: z.string(),
    weightPercentage: z.coerce.number().optional(),
    weight: z.coerce.number().optional(),
  })
  .passthrough();

/** Inferred type for a raw ETF country weighting. */
export type FmpCountryWeighting = z.infer<typeof fmpCountryWeightingSchema>;

/** Zod schema for a raw FMP `quote-short` row. */
export const fmpQuoteShortSchema = z
  .object({
    symbol: z.string(),
    price: z.coerce.number(),
    volume: z.coerce.number().optional(),
    change: z.coerce.number().optional(),
    changesPercentage: z.coerce.number().optional(),
  })
  .passthrough();

/** Inferred type for a raw FMP quote-short row. */
export type FmpQuoteShort = z.infer<typeof fmpQuoteShortSchema>;

/** Zod schema for a raw FMP `news/general-latest` article row. */
export const fmpNewsArticleSchema = z
  .object({
    symbol: z.string().nullable().optional(),
    publishedDate: z.string(),
    publisher: z.string().nullable().optional(),
    title: z.string(),
    image: z.string().nullable().optional(),
    site: z.string().nullable().optional(),
    text: z.string().nullable().optional(),
    url: z.string(),
  })
  .passthrough();

/** Inferred type for a raw FMP news article row. */
export type FmpNewsArticle = z.infer<typeof fmpNewsArticleSchema>;

/** Zod schema for a raw FMP `quote` row. */
export const fmpQuoteSchema = z
  .object({
    symbol: z.string(),
    price: z.coerce.number(),
    change: z.coerce.number().optional(),
    changePercentage: z.coerce.number().optional(),
    changesPercentage: z.coerce.number().optional(),
    previousClose: z.coerce.number().optional(),
    volume: z.coerce.number().optional(),
    timestamp: z.coerce.number().optional(),
  })
  .passthrough();

/** Inferred type for a raw FMP quote row. */
export type FmpQuote = z.infer<typeof fmpQuoteSchema>;
