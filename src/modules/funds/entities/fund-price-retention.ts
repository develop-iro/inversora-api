import { FUND_RETURN_HISTORY_LOOKBACK_DAYS } from './fund-returns.enricher';
import { addDaysToIsoDate, getTodayIsoDate } from './fund-price.mapper';

/** Minimum retention window required for 5-year return snapshots. */
export const FUND_PRICES_MIN_RETENTION_YEARS = Math.ceil(
  FUND_RETURN_HISTORY_LOOKBACK_DAYS / 365,
);

/** Default persisted price history retention in calendar years. */
export const FUND_PRICES_DEFAULT_RETENTION_YEARS = 7;

/**
 * Computes the exclusive ISO date cutoff for price retention.
 *
 * Rows with `date` strictly before the cutoff may be deleted.
 *
 * @param retentionYears - Number of full calendar years to keep.
 * @returns ISO date string for the oldest retained day.
 */
export function getFundPriceRetentionCutoffIsoDate(
  retentionYears: number,
): string {
  return addDaysToIsoDate(getTodayIsoDate(), -retentionYears * 365);
}
