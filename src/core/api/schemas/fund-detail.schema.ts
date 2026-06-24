import { z } from 'zod';
import { fundVehicleTypeSchema } from '../../../modules/funds/entities/fund.schema';

/** App-aligned risk level labels. */
export const fundDetailRiskLevelSchema = z.enum(['low', 'medium', 'high']);

/** App-aligned diversification labels. */
export const fundDetailDiversificationSchema = z.enum([
  'low',
  'medium',
  'high',
]);

/** Scoring confidence status exposed to the mobile client. */
export const fundDetailScoringStatusSchema = z.enum([
  'ok',
  'warning',
  'quarantined',
]);

/** App score criterion identifiers. */
export const fundDetailScoreCriterionIdSchema = z.enum([
  'ter',
  'tracking',
  'aum',
  'age',
  'consistency',
  'dataQuality',
]);

/** Performance chart timeframes expected by the mobile client. */
export const fundDetailPerformanceTimeframeSchema = z.enum([
  'ytd',
  '1y',
  '3y',
  '5y',
  'max',
]);

/** Exposure tab identifiers in the fund detail profile. */
export const fundDetailExposureTabIdSchema = z.enum([
  'sectorial',
  'regional',
  'assetAllocation',
  'capitalization',
  'portfolio',
]);

/** Ratio horizon identifiers in the fund detail profile. */
export const fundDetailRatioHorizonSchema = z.enum(['12m', '3y', '5y']);

/** Featured fund card payload nested in `FundDetail`. */
export const featuredFundSchema = z.object({
  id: z.uuid(),
  isin: z.string().regex(/^[A-Z]{2}[A-Z0-9]{9}[0-9]$/),
  name: z.string().min(1),
  vehicleType: fundVehicleTypeSchema,
  categoryLabel: z.string(),
  themeLabel: z.string(),
  badge: z.string(),
  idealForBeginners: z.boolean(),
  efficiencyScore: z.number().int().min(0).max(100),
  terPercent: z.number().nonnegative(),
  riskLevel: fundDetailRiskLevelSchema,
  diversification: fundDetailDiversificationSchema,
  quarterTag: z.string(),
  periodStart: z.string(),
  periodEnd: z.string(),
  benefitSummary: z.string(),
  featuredReason: z.string(),
  isFeatured: z.boolean(),
});

/** Single score criterion row for the mobile breakdown UI. */
export const scoreCriterionResultSchema = z.object({
  id: fundDetailScoreCriterionIdSchema,
  label: z.string().min(1),
  points: z.number().int().min(0),
  maxPoints: z.number().int().positive(),
});

/** Indexed performance point for educational charts. */
export const fundPerformancePointSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  value: z.number().nonnegative(),
});

/** Performance series for a single timeframe. */
export const fundPerformanceSeriesSchema = z.object({
  timeframe: fundDetailPerformanceTimeframeSchema,
  points: z.array(fundPerformancePointSchema),
  asOf: z.string().datetime(),
  sourceLabel: z.string().min(1),
});

/** Regional slice used in the market snapshot hero. */
export const fundRegionSliceSchema = z.object({
  label: z.string().min(1),
  percent: z.number().nonnegative(),
});

/** Market snapshot for charts and regional summary. */
export const fundMarketSnapshotSchema = z.object({
  performanceByTimeframe: z.object({
    ytd: fundPerformanceSeriesSchema,
    '1y': fundPerformanceSeriesSchema,
    '3y': fundPerformanceSeriesSchema,
    '5y': fundPerformanceSeriesSchema,
    max: fundPerformanceSeriesSchema,
  }),
  regions: z.array(fundRegionSliceSchema),
  stabilityLabel: z.string().min(1),
  stabilityChangePercent: z.number().optional(),
});

/** Key-value row in profile summary tables. */
export const fundProfileRowSchema = z.object({
  id: z.string().min(1),
  label: z.string().min(1),
  value: z.string(),
  emphasis: z.enum(['link']).optional(),
});

/** Regulatory document row in the profile section. */
export const fundDocumentRowSchema = z.object({
  id: z.string().min(1),
  label: z.string().min(1),
  status: z.enum(['available', 'coming_soon']),
  url: z.string().url().optional(),
});

/** Period return row in the profile section. */
export const fundReturnPeriodSchema = z.object({
  id: z.string().min(1),
  label: z.string().min(1),
  percent: z.number().nullable(),
});

/** Calendar-year return row in the profile section. */
export const fundReturnYearSchema = z.object({
  year: z.number().int(),
  percent: z.number().nullable(),
});

/** Ratio row for a given horizon. */
export const fundRatioRowSchema = z.object({
  id: z.string().min(1),
  label: z.string().min(1),
  value: z.string(),
});

/** Allocation slice used in exposure tabs. */
export const allocationSliceSchema = z.object({
  label: z.string().min(1),
  percent: z.number().nonnegative(),
  icon: z.string().optional(),
});

/** Illustrative distributor row (not a purchase link). */
export const fundDistributorSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  kind: z.enum(['bank', 'broker']),
  note: z.string().optional(),
});

/** Extended profile payload nested in `FundDetail`. */
export const fundDetailProfileSchema = z.object({
  asOf: z.string().datetime(),
  sourceLabel: z.string().min(1),
  description: z.string(),
  manager: z.string(),
  benchmark: z.string(),
  vehicleType: fundVehicleTypeSchema,
  tracksIndex: z.boolean(),
  fundAum: z.string(),
  classAum: z.string().optional(),
  inceptionDate: z.string(),
  summaryRows: z.array(fundProfileRowSchema),
  feeRows: z.array(fundProfileRowSchema),
  documents: z.array(fundDocumentRowSchema),
  returnsByPeriod: z.array(fundReturnPeriodSchema),
  returnsByYear: z.array(fundReturnYearSchema),
  currencyNote: z.string(),
  methodNote: z.string(),
  ratiosByHorizon: z.object({
    '12m': z.array(fundRatioRowSchema),
    '3y': z.array(fundRatioRowSchema),
    '5y': z.array(fundRatioRowSchema),
  }),
  exposureByTab: z.object({
    sectorial: z.array(allocationSliceSchema),
    regional: z.array(allocationSliceSchema),
    assetAllocation: z.array(allocationSliceSchema),
    capitalization: z.array(allocationSliceSchema),
    portfolio: z.array(allocationSliceSchema),
  }),
  distributors: z.array(fundDistributorSchema),
});

/** Aggregated fund detail response for `GET /funds/:isin`. */
export const fundDetailResponseSchema = z.object({
  fund: featuredFundSchema,
  inversoraScore: z.number().int().min(0).max(100),
  rank: z.number().int().positive().optional(),
  scoredBreakdown: z.array(scoreCriterionResultSchema).length(6),
  scoringStatus: fundDetailScoringStatusSchema,
  market: fundMarketSnapshotSchema,
  profile: fundDetailProfileSchema,
});

/** Inferred type for the aggregated fund detail response. */
export type FundDetailResponse = z.infer<typeof fundDetailResponseSchema>;

/** Inferred type for featured fund card data. */
export type FeaturedFund = z.infer<typeof featuredFundSchema>;

/** Inferred type for score criterion rows. */
export type ScoreCriterionResult = z.infer<typeof scoreCriterionResultSchema>;

/** Inferred type for market snapshots. */
export type FundMarketSnapshot = z.infer<typeof fundMarketSnapshotSchema>;

/** Inferred type for profile payloads. */
export type FundDetailProfile = z.infer<typeof fundDetailProfileSchema>;

/** Inferred type for performance timeframes. */
export type FundDetailPerformanceTimeframe = z.infer<
  typeof fundDetailPerformanceTimeframeSchema
>;

/** Inferred type for exposure tab identifiers. */
export type FundDetailExposureTabId = z.infer<
  typeof fundDetailExposureTabIdSchema
>;

/** Inferred type for allocation slices. */
export type AllocationSlice = z.infer<typeof allocationSliceSchema>;
