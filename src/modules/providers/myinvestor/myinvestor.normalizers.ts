import {
  providerMyInvestorFundSchema,
  type ProviderMyInvestorExposure,
  type ProviderMyInvestorFund,
} from './myinvestor.domain.schemas';
import type {
  MyInvestorFund,
  MyInvestorNamedPct,
} from './myinvestor.raw.schemas';

/**
 * Extracts the `YYYY-MM-DD` date part from a MyInvestor ISO timestamp.
 *
 * @param value - Raw timestamp such as `2026-07-09T00:00:00Z`.
 * @returns ISO date or `undefined` when the value has no valid date prefix.
 */
function extractDatePart(value: string | null | undefined): string | undefined {
  const match = value?.trim().match(/^(\d{4}-\d{2}-\d{2})/);

  return match?.[1];
}

/**
 * Converts a nullable raw value to `undefined` when absent.
 *
 * @param value - Raw nullable field.
 */
function orUndefined<T>(value: T | null | undefined): T | undefined {
  return value ?? undefined;
}

/**
 * Converts MyInvestor 0/1 flags to booleans.
 *
 * @param value - Raw numeric flag.
 */
function toFlag(value: number | null | undefined): boolean | undefined {
  if (value === null || value === undefined) {
    return undefined;
  }

  return value !== 0;
}

/**
 * Maps raw named percentage rows to normalized exposure rows.
 *
 * @param rows - Raw sector or region rows.
 * @returns Normalized exposures sorted by weight descending.
 */
export function normalizeMyInvestorExposures(
  rows: readonly MyInvestorNamedPct[] | null | undefined,
): ProviderMyInvestorExposure[] {
  return (rows ?? [])
    .filter(
      (row): row is MyInvestorNamedPct & { pct: number } =>
        typeof row.pct === 'number' &&
        row.pct > 0 &&
        row.name.trim().length > 0,
    )
    .map((row) => ({
      name: row.name.trim(),
      weightPercentage: row.pct,
    }))
    .sort((left, right) => right.weightPercentage - left.weightPercentage);
}

/**
 * Maps a raw MyInvestor fund row to the normalized provider snapshot.
 *
 * Drops `warning_text` and other advisory copy by construction: only the
 * fields declared in the domain schema are carried over.
 *
 * @param fund - Raw MyInvestor fund row.
 * @returns Normalized fund snapshot or `null` when validation fails.
 */
export function normalizeMyInvestorFund(
  fund: MyInvestorFund,
): ProviderMyInvestorFund | null {
  const kiidUrl = fund.url_kiid?.trim();

  const parsed = providerMyInvestorFundSchema.safeParse({
    isin: fund.isin.trim().toUpperCase(),
    name: fund.name.trim(),
    productType: orUndefined(fund.product_type),
    assetClass: orUndefined(fund.asset_class),
    category: orUndefined(fund.category),
    morningstarCategory: orUndefined(fund.category_morningstar),
    geographicZone: orUndefined(fund.geographic_zone),
    managementCompany: orUndefined(fund.management_company),
    currency: orUndefined(fund.currency),
    ter: orUndefined(fund.ter),
    srri: orUndefined(fund.risk_indicator),
    morningstarRating: orUndefined(fund.mstar_rating),
    volatility1y: orUndefined(fund.volatility_1y),
    volatility3y: orUndefined(fund.volatility_3y),
    volatility5y: orUndefined(fund.volatility_5y),
    trackingError1y: orUndefined(fund.tracking_error_1y),
    returnYtdPercent: orUndefined(fund.ytd),
    return1yPercent: orUndefined(fund.return_1y),
    return3yPercent: orUndefined(fund.return_3y),
    return5yPercent: orUndefined(fund.return_5y),
    assetsUnderManagement: orUndefined(fund.aum),
    nav: orUndefined(fund.nav),
    navDate: extractDatePart(fund.nav_date),
    inceptionDate: extractDatePart(fund.inception_date),
    allocationEquityPercent: orUndefined(fund.alloc_equity),
    allocationBondPercent: orUndefined(fund.alloc_bond),
    allocationCashPercent: orUndefined(fund.alloc_cash),
    allocationOtherPercent: orUndefined(fund.alloc_other),
    distributing: toFlag(fund.distributing),
    esg: toFlag(fund.esg),
    minInitialInvestment: orUndefined(fund.min_initial),
    description: orUndefined(fund.description),
    kiidUrl:
      kiidUrl !== undefined && kiidUrl.startsWith('https://')
        ? kiidUrl
        : undefined,
    topSectors: normalizeMyInvestorExposures(fund.top_sectors),
    topRegions: normalizeMyInvestorExposures(fund.top_regions),
  });

  return parsed.success ? parsed.data : null;
}

/**
 * Maps raw MyInvestor fund rows to normalized snapshots, dropping invalid rows.
 *
 * @param funds - Raw MyInvestor fund rows.
 * @returns Normalized fund snapshots.
 */
export function normalizeMyInvestorFunds(
  funds: readonly MyInvestorFund[],
): ProviderMyInvestorFund[] {
  return funds
    .map((fund) => normalizeMyInvestorFund(fund))
    .filter((fund): fund is ProviderMyInvestorFund => fund !== null);
}
