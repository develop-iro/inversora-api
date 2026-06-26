import type {
  FmpEtfListEntry,
  FmpSearchResult,
} from './financial-modeling-prep.raw.schemas';

/** Name pattern that identifies broad or benchmark-tracking indexed products. */
const INDEXED_PRODUCT_NAME_PATTERN =
  /\b(index|indx|s&p|sp\s*500|msci|russell|nasdaq\s*100|ftse|crsp|wilshire|total stock market|total bond|total market|broad market|all[\s-]country|world stock|ucits etf)\b/i;

/** Specialty products excluded from indexed-product discovery. */
const NON_INDEXED_PRODUCT_NAME_PATTERN =
  /\b(leveraged|inverse|hedged|high income|convexity|fossil fuel|2x|3x|-1x|-2x|-3x)\b/i;

/** Fund-like name pattern used when filtering search results. */
const FUND_NAME_PATTERN = /\b(ETF|ETN|UCITS|FUND|TRUST)\b/i;

/** Stock-like name pattern excluded from fund search results. */
const NON_FUND_NAME_PATTERN =
  /\b(INC\.?|CORP\.?|CORPORATION|LIMITED|PLC|HOLDINGS?)\b/i;

/**
 * Determines whether a raw FMP search row likely represents a fund vehicle.
 *
 * @param result - Raw FMP search result.
 * @returns `true` when the row looks like an ETF or mutual fund.
 */
export function isLikelyFundSearchResult(result: FmpSearchResult): boolean {
  if (FUND_NAME_PATTERN.test(result.name)) {
    return !NON_FUND_NAME_PATTERN.test(result.name);
  }

  const exchange =
    result.exchangeShortName ?? result.exchange ?? result.stockExchange;

  return exchange?.trim().toUpperCase() === 'MUTUAL_FUND';
}

/**
 * Determines whether a raw FMP search row likely represents an index-tracking product.
 *
 * @param result - Raw FMP search result.
 * @returns `true` when the row looks like an indexed ETF or mutual fund.
 */
export function isIndexedProductSearchResult(result: FmpSearchResult): boolean {
  if (!isLikelyFundSearchResult(result)) {
    return false;
  }

  return isIndexedProductName(result.name);
}

/**
 * Determines whether an FMP ETF list row represents an index-tracking product.
 *
 * @param entry - Raw ETF list row (`symbol` + `name` only).
 * @returns `true` when the row matches indexed-product heuristics.
 */
export function isIndexedEtfListEntry(entry: FmpEtfListEntry): boolean {
  if (!FUND_NAME_PATTERN.test(entry.name)) {
    return false;
  }

  return isIndexedProductName(entry.name);
}

/**
 * Returns whether a product name matches indexed-product inclusion rules.
 *
 * @param name - Fund or ETF display name.
 * @returns `true` when the name looks like a broad index tracker.
 */
function isIndexedProductName(name: string): boolean {
  if (NON_INDEXED_PRODUCT_NAME_PATTERN.test(name)) {
    return false;
  }

  return INDEXED_PRODUCT_NAME_PATTERN.test(name);
}
