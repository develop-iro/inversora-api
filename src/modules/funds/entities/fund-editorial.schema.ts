import { z } from 'zod';

/** Editorial product copy persisted alongside catalog data (not from FMP). */
export const fundEditorialSchema = z.object({
  badge: z.string(),
  themeLabel: z.string(),
  idealForBeginners: z.boolean(),
});

/** Inferred type for fund editorial fields. */
export type FundEditorial = z.infer<typeof fundEditorialSchema>;

/** Default editorial values for newly synced funds. */
export const DEFAULT_FUND_EDITORIAL: FundEditorial = {
  badge: '',
  themeLabel: '',
  idealForBeginners: false,
};

/** Partial admin update payload for editorial fields. */
export const updateFundEditorialInputSchema = fundEditorialSchema.partial();

/** Parsed admin editorial update input. */
export type UpdateFundEditorialInput = z.infer<
  typeof updateFundEditorialInputSchema
>;
