import { addDaysToIsoDate, formatFundPriceDate } from './fund-price.mapper';
import type { FundPrice } from './fund-price.schema';
import {
  fundChartResponseSchema,
  type FundChartPeriod,
  type FundChartPoint,
  type FundChartResponse,
} from './fund-chart.schema';

const CHART_PERIOD_DAYS: Record<FundChartPeriod, number> = {
  '1M': 30,
  '3M': 90,
  '1Y': 365,
  '3Y': 365 * 3,
  '5Y': 365 * 5,
};

/**
 * Subtracts a chart lookback window from an ISO date-only string.
 *
 * @param date - Anchor ISO date string (`YYYY-MM-DD`).
 * @param period - Chart lookback window.
 * @returns ISO date string for the window start.
 */
export function subtractChartPeriodFromIsoDate(
  date: string,
  period: FundChartPeriod,
): string {
  return addDaysToIsoDate(date, -CHART_PERIOD_DAYS[period]);
}

/**
 * Resolves the inclusive chart date range for a lookback window.
 *
 * @param period - Chart lookback window.
 * @param latestDate - Latest persisted price date, if any.
 * @returns Window start date and optional end date.
 */
export function resolveChartDateRange(
  period: FundChartPeriod,
  latestDate: string | null,
): { from: string; to: string | null } {
  if (latestDate === null) {
    const today = formatFundPriceDate(new Date());

    return {
      from: subtractChartPeriodFromIsoDate(today, period),
      to: null,
    };
  }

  return {
    from: subtractChartPeriodFromIsoDate(latestDate, period),
    to: latestDate,
  };
}

/**
 * Maps persisted price rows to indexed chart points.
 *
 * @param prices - Price rows ordered by date ascending.
 * @returns Chart points with close prices and index values.
 */
export function mapFundPricesToChartPoints(
  prices: readonly FundPrice[],
): FundChartPoint[] {
  if (prices.length === 0) {
    return [];
  }

  const baseClose = prices[0].close;

  return prices.map((price) => ({
    date: price.date,
    close: price.close,
    value:
      baseClose === 0
        ? 100
        : Number(((price.close / baseClose) * 100).toFixed(4)),
  }));
}

/**
 * Builds the chart response payload for a fund lookback window.
 *
 * @param fundId - Persisted fund identifier.
 * @param period - Selected chart lookback window.
 * @param from - Window start date.
 * @param to - Window end date when price data exists.
 * @param prices - Persisted price rows in the requested window.
 * @returns Validated chart response.
 */
export function buildFundChartResponse(
  fundId: string,
  period: FundChartPeriod,
  from: string,
  to: string | null,
  prices: readonly FundPrice[],
): FundChartResponse {
  const points = mapFundPricesToChartPoints(prices);
  const asOf = points.at(-1)?.date ?? null;

  return fundChartResponseSchema.parse({
    fundId,
    period,
    from,
    to: to ?? asOf,
    asOf,
    points,
  });
}
