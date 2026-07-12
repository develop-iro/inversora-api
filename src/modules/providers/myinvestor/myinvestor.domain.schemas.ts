import { z } from 'zod';

/** Zod schema for a normalized exposure row (sector or region). */
export const providerMyInvestorExposureSchema = z.object({
  name: z.string().min(1),
  weightPercentage: z.number().nonnegative(),
});

/** Inferred type for a normalized exposure row. */
export type ProviderMyInvestorExposure = z.infer<
  typeof providerMyInvestorExposureSchema
>;

/**
 * Zod schema for a normalized MyInvestor fund snapshot.
 *
 * Marketing and quasi-advisory fields from the raw payload (for example
 * `warning_text`) are intentionally excluded: Inversora must never surface
 * provider recommendations.
 */
export const providerMyInvestorFundSchema = z.object({
  isin: z.string().min(1),
  name: z.string().min(1),
  productType: z.string().optional(),
  assetClass: z.string().optional(),
  category: z.string().optional(),
  morningstarCategory: z.string().optional(),
  geographicZone: z.string().optional(),
  managementCompany: z.string().optional(),
  currency: z.string().optional(),
  ter: z.number().nonnegative().optional(),
  srri: z.number().int().min(1).max(7).optional(),
  morningstarRating: z.number().int().min(1).max(5).optional(),
  volatility1y: z.number().optional(),
  volatility3y: z.number().optional(),
  volatility5y: z.number().optional(),
  trackingError1y: z.number().optional(),
  returnYtdPercent: z.number().optional(),
  return1yPercent: z.number().optional(),
  return3yPercent: z.number().optional(),
  return5yPercent: z.number().optional(),
  assetsUnderManagement: z.number().nonnegative().optional(),
  nav: z.number().optional(),
  navDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  inceptionDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  allocationEquityPercent: z.number().optional(),
  allocationBondPercent: z.number().optional(),
  allocationCashPercent: z.number().optional(),
  allocationOtherPercent: z.number().optional(),
  distributing: z.boolean().optional(),
  esg: z.boolean().optional(),
  minInitialInvestment: z.string().optional(),
  description: z.string().optional(),
  kiidUrl: z.string().url().optional(),
  topSectors: z.array(providerMyInvestorExposureSchema),
  topRegions: z.array(providerMyInvestorExposureSchema),
});

/** Inferred type for a normalized MyInvestor fund snapshot. */
export type ProviderMyInvestorFund = z.infer<
  typeof providerMyInvestorFundSchema
>;
