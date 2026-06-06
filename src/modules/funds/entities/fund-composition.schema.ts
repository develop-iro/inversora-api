import { z } from 'zod';
import { fundPriceDateSchema } from './fund-price.schema';

/** Supported exposure dimensions for persisted allocation slices. */
export const fundAllocationCategorySchema = z.enum([
  'sectorial',
  'regional',
  'assetAllocation',
  'capitalization',
  'portfolio',
]);

/** Inferred type for fund allocation categories. */
export type FundAllocationCategory = z.infer<
  typeof fundAllocationCategorySchema
>;

/** Zod schema for an individual fund holding within a portfolio snapshot. */
export const fundHoldingSchema = z.object({
  id: z.uuid(),
  fundId: z.uuid(),
  asOf: fundPriceDateSchema,
  rank: z.number().int().positive(),
  asset: z.string().min(1).nullable(),
  name: z.string().min(1),
  isin: z.string().min(1).nullable(),
  weightPercentage: z.number().nonnegative(),
  marketValue: z.number().nonnegative().nullable(),
  sharesNumber: z.number().nonnegative().nullable(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});

/** Inferred type for a persisted fund holding. */
export type FundHolding = z.infer<typeof fundHoldingSchema>;

/** Zod schema for a weighted allocation slice within an exposure snapshot. */
export const fundAllocationSchema = z.object({
  id: z.uuid(),
  fundId: z.uuid(),
  asOf: fundPriceDateSchema,
  category: fundAllocationCategorySchema,
  label: z.string().min(1),
  weight: z.number().nonnegative(),
  sortOrder: z.number().int().nonnegative(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});

/** Inferred type for a persisted fund allocation slice. */
export type FundAllocation = z.infer<typeof fundAllocationSchema>;

/** Input schema for upserting a holding row before persistence assigns ids. */
export const upsertFundHoldingInputSchema = fundHoldingSchema.pick({
  rank: true,
  asset: true,
  name: true,
  isin: true,
  weightPercentage: true,
  marketValue: true,
  sharesNumber: true,
});

/** Input type for upserting a holding row. */
export type UpsertFundHoldingInput = z.infer<
  typeof upsertFundHoldingInputSchema
>;

/** Input schema for upserting an allocation slice before persistence assigns ids. */
export const upsertFundAllocationInputSchema = fundAllocationSchema.pick({
  category: true,
  label: true,
  weight: true,
  sortOrder: true,
});

/** Input type for upserting an allocation slice. */
export type UpsertFundAllocationInput = z.infer<
  typeof upsertFundAllocationInputSchema
>;

/** Portfolio snapshot aggregate used by fund detail exposure views. */
export const fundCompositionSchema = z.object({
  asOf: fundPriceDateSchema,
  holdings: z.array(fundHoldingSchema),
  allocations: z.array(fundAllocationSchema),
});

/** Inferred type for a persisted fund composition snapshot. */
export type FundComposition = z.infer<typeof fundCompositionSchema>;

/** Input schema for replacing a fund composition snapshot. */
export const replaceFundCompositionInputSchema = z.object({
  asOf: fundPriceDateSchema,
  holdings: z.array(upsertFundHoldingInputSchema),
  allocations: z.array(upsertFundAllocationInputSchema),
});

/** Input type for replacing a fund composition snapshot. */
export type ReplaceFundCompositionInput = z.infer<
  typeof replaceFundCompositionInputSchema
>;
