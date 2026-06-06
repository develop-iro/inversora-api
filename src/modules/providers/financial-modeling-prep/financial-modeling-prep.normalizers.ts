import {
  indexFundDetailSchema,
  indexFundHistoricalPriceSchema,
  indexFundPriceSummarySchema,
  indexFundProfileSchema,
  indexFundSearchResultSchema,
} from './financial-modeling-prep.domain.schemas';
import type {
  IndexFundDetail,
  IndexFundHistoricalPrice,
  IndexFundPriceSummary,
  IndexFundProfile,
  IndexFundSearchResult,
} from './financial-modeling-prep.domain.schemas';
import { isIndexFundSearchResult } from './index-fund.filters';
import type {
  FmpFundProfile,
  FmpHistoricalPrice,
  FmpSearchResult,
} from './financial-modeling-prep.raw.schemas';

/**
 * Extracts a benchmark label from an index fund name when possible.
 *
 * @param name - Fund display name.
 * @returns Benchmark label or `undefined`.
 */
export function extractBenchmarkFromName(name: string): string | undefined {
  const patterns: readonly { readonly pattern: RegExp; readonly label: string }[] =
    [
      { pattern: /\bs&p\s*500\b/i, label: 'S&P 500' },
      { pattern: /\btotal stock market\b/i, label: 'US Total Stock Market' },
      { pattern: /\bmsci\b/i, label: 'MSCI' },
      { pattern: /\brussell\b/i, label: 'Russell' },
      { pattern: /\bnasdaq\s*100\b/i, label: 'Nasdaq 100' },
      { pattern: /\bftse\b/i, label: 'FTSE' },
      { pattern: /\bindex\b/i, label: 'Broad Market Index' },
    ];

  const match = patterns.find((entry) => entry.pattern.test(name));

  return match?.label;
}

/**
 * Maps a raw FMP search result to the normalized index fund search shape.
 *
 * @param result - Raw FMP search result.
 * @returns Normalized index fund search result.
 */
export function normalizeIndexFundSearchResult(
  result: FmpSearchResult,
): IndexFundSearchResult {
  return indexFundSearchResultSchema.parse({
    symbol: result.symbol,
    name: result.name,
    currency: result.currency,
    exchange: result.exchangeShortName ?? result.exchange,
    exchangeFullName: result.exchangeFullName ?? result.stockExchange,
  });
}

/**
 * Maps raw FMP search results to normalized index fund search results.
 *
 * @param results - Raw FMP search results.
 * @returns Normalized index fund search results.
 */
export function normalizeIndexFundSearchResults(
  results: readonly FmpSearchResult[],
): IndexFundSearchResult[] {
  return results
    .filter(isIndexFundSearchResult)
    .map((result) => normalizeIndexFundSearchResult(result));
}

/**
 * Maps a raw FMP fund profile to the normalized index fund profile shape.
 *
 * @param profile - Raw FMP fund profile.
 * @param searchResult - Optional search metadata used to enrich the profile.
 * @returns Normalized index fund profile.
 */
export function normalizeIndexFundProfile(
  profile: FmpFundProfile,
  searchResult?: FmpSearchResult,
): IndexFundProfile {
  const name = profile.name ?? searchResult?.name ?? profile.symbol;

  return indexFundProfileSchema.parse({
    symbol: profile.symbol,
    name,
    description: profile.description,
    expenseRatio: profile.expenseRatio,
    assetsUnderManagement: profile.assetsUnderManagement,
    nav: profile.nav,
    navCurrency: profile.navCurrency,
    holdingsCount: profile.holdingsCount,
    inceptionDate: profile.inceptionDate,
    issuer: profile.etfCompany,
    assetClass: profile.assetClass,
    domicile: profile.domicile,
    currency: searchResult?.currency,
    exchange: searchResult?.exchangeShortName ?? searchResult?.exchange,
    exchangeFullName:
      searchResult?.exchangeFullName ?? searchResult?.stockExchange,
    benchmark: extractBenchmarkFromName(name),
  });
}

/**
 * Builds a partial index fund profile from a search result.
 *
 * @param searchResult - Raw FMP search result.
 * @returns Normalized index fund profile with search-derived fields only.
 */
export function normalizeIndexFundProfileFromSearch(
  searchResult: FmpSearchResult,
): IndexFundProfile {
  return indexFundProfileSchema.parse({
    symbol: searchResult.symbol,
    name: searchResult.name,
    currency: searchResult.currency,
    exchange: searchResult.exchangeShortName ?? searchResult.exchange,
    exchangeFullName:
      searchResult.exchangeFullName ?? searchResult.stockExchange,
    benchmark: extractBenchmarkFromName(searchResult.name),
  });
}

/**
 * Maps raw FMP historical prices to normalized price points.
 *
 * @param prices - Raw FMP historical prices.
 * @returns Normalized historical prices sorted by date descending.
 */
export function normalizeIndexFundHistoricalPrices(
  prices: readonly FmpHistoricalPrice[],
): IndexFundHistoricalPrice[] {
  return prices
    .map((price) =>
      indexFundHistoricalPriceSchema.parse({
        date: price.date,
        open: price.open,
        high: price.high,
        low: price.low,
        close: price.close,
        volume: price.volume,
        change: price.change,
        changePercent: price.changePercent,
        vwap: price.vwap,
      }),
    )
    .sort((left, right) => right.date.localeCompare(left.date));
}

/**
 * Builds derived price statistics from a normalized historical series.
 *
 * @param prices - Normalized historical prices sorted by date descending.
 * @returns Derived price summary for the provided window.
 * @throws {Error} When the historical series is empty.
 */
export function buildIndexFundPriceSummary(
  prices: readonly IndexFundHistoricalPrice[],
): IndexFundPriceSummary {
  if (prices.length === 0) {
    throw new Error('Cannot build price summary from an empty historical series');
  }

  const latest = prices[0];
  const oldest = prices[prices.length - 1];
  const periodHigh = Math.max(...prices.map((price) => price.high));
  const periodLow = Math.min(...prices.map((price) => price.low));
  const volumes = prices
    .map((price) => price.volume)
    .filter((volume): volume is number => volume !== undefined);
  const averageVolume =
    volumes.length > 0
      ? volumes.reduce((total, volume) => total + volume, 0) / volumes.length
      : undefined;
  const periodReturnPercent =
    oldest.close === 0
      ? 0
      : ((latest.close - oldest.close) / oldest.close) * 100;

  return indexFundPriceSummarySchema.parse({
    latestDate: latest.date,
    latestClose: latest.close,
    periodStartDate: oldest.date,
    periodStartClose: oldest.close,
    periodReturnPercent,
    periodHigh,
    periodLow,
    averageVolume,
  });
}

/**
 * Builds the normalized index fund detail aggregate.
 *
 * @param profile - Normalized index fund profile.
 * @param prices - Normalized historical prices.
 * @param includeHistory - Whether to include the full historical series.
 * @returns Index fund detail aggregate.
 */
export function buildIndexFundDetail(
  profile: IndexFundProfile,
  prices: readonly IndexFundHistoricalPrice[],
  includeHistory = false,
): IndexFundDetail {
  return indexFundDetailSchema.parse({
    ...profile,
    priceSummary: buildIndexFundPriceSummary(prices),
    history: includeHistory ? [...prices] : undefined,
  });
}
