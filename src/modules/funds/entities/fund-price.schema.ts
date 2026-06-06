import { z } from 'zod';

/** ISO date string used for persisted end-of-day price rows. */
export const fundPriceDateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must follow the YYYY-MM-DD format');

/** Zod schema for a persisted end-of-day fund price point. */
export const fundPriceSchema = z.object({
  id: z.uuid(),
  fundId: z.uuid(),
  date: fundPriceDateSchema,
  open: z.number().positive(),
  high: z.number().positive(),
  low: z.number().positive(),
  close: z.number().positive(),
  volume: z.number().int().nonnegative().nullable(),
  change: z.number().nullable(),
  changePercent: z.number().nullable(),
  vwap: z.number().positive().nullable(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});

/** Inferred type for a persisted end-of-day fund price point. */
export type FundPrice = z.infer<typeof fundPriceSchema>;

/** Input schema for upserting price rows before persistence assigns ids and timestamps. */
export const upsertFundPriceInputSchema = fundPriceSchema.pick({
  date: true,
  open: true,
  high: true,
  low: true,
  close: true,
  volume: true,
  change: true,
  changePercent: true,
  vwap: true,
});

/** Input type for upserting a single price row. */
export type UpsertFundPriceInput = z.infer<typeof upsertFundPriceInputSchema>;

/** Query options for reading a fund price history window. */
export const fundPriceHistoryQuerySchema = z.object({
  from: fundPriceDateSchema.optional(),
  to: fundPriceDateSchema.optional(),
});

/** Query options type for reading fund price history. */
export type FundPriceHistoryQuery = z.infer<typeof fundPriceHistoryQuerySchema>;
