import { z } from 'zod';
import { fundPriceDateSchema } from './fund-price.schema';

/** Supported chart lookback windows for fund performance charts. */
export const fundChartPeriodSchema = z.enum(['1M', '3M', '1Y', '3Y', '5Y']);

/** Inferred type for chart lookback windows. */
export type FundChartPeriod = z.infer<typeof fundChartPeriodSchema>;

/** Query schema for `GET /funds/:id/chart`. */
export const fundChartQuerySchema = z.object({
  period: fundChartPeriodSchema.default('1Y'),
});

/** Parsed query type for `GET /funds/:id/chart`. */
export type FundChartQuery = z.infer<typeof fundChartQuerySchema>;

/** Single chart point indexed from the start of the selected window. */
export const fundChartPointSchema = z.object({
  date: fundPriceDateSchema,
  close: z.number().positive(),
  value: z.number().positive(),
});

/** Inferred type for a chart point. */
export type FundChartPoint = z.infer<typeof fundChartPointSchema>;

/** Response schema for `GET /funds/:id/chart`. */
export const fundChartResponseSchema = z.object({
  fundId: z.uuid(),
  period: fundChartPeriodSchema,
  from: fundPriceDateSchema,
  to: fundPriceDateSchema.nullable(),
  asOf: fundPriceDateSchema.nullable(),
  points: z.array(fundChartPointSchema),
});

/** Response type for `GET /funds/:id/chart`. */
export type FundChartResponse = z.infer<typeof fundChartResponseSchema>;
