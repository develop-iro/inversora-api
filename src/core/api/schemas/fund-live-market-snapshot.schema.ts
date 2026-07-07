import { z } from 'zod';

/** Freshness tier for a fund market snapshot shown in the mobile app. */
export const fundLiveMarketFreshnessSchema = z.enum([
  'live',
  'eod',
  'unavailable',
]);

/** Inferred type for market snapshot freshness. */
export type FundLiveMarketFreshness = z.infer<
  typeof fundLiveMarketFreshnessSchema
>;

/** Response schema for `GET /funds/:isin/market-snapshot`. */
export const fundLiveMarketSnapshotSchema = z.object({
  isin: z.string().min(1),
  symbol: z.string().min(1),
  price: z.number().nullable(),
  changePercent: z.number().nullable(),
  asOf: z.string().datetime(),
  freshness: fundLiveMarketFreshnessSchema,
  sourceLabel: z.string().min(1),
});

/** Response type for `GET /funds/:isin/market-snapshot`. */
export type FundLiveMarketSnapshot = z.infer<
  typeof fundLiveMarketSnapshotSchema
>;
