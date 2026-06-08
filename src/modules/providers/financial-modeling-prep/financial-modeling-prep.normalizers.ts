import {
  indexFundCompositionSchema,
  indexFundCountryWeightingSchema,
  indexFundDetailSchema,
  indexFundHistoricalPriceSchema,
  indexFundHoldingSchema,
  indexFundPriceSummarySchema,
  indexFundProfileSchema,
  indexFundSearchResultSchema,
  indexFundSectorWeightingSchema,
} from './financial-modeling-prep.domain.schemas';
import type {
  IndexFundComposition,
  IndexFundCountryWeighting,
  IndexFundDetail,
  IndexFundHistoricalPrice,
  IndexFundHolding,
  IndexFundPriceSummary,
  IndexFundProfile,
  IndexFundSearchResult,
  IndexFundSectorWeighting,
} from './financial-modeling-prep.domain.schemas';
import { isIndexFundSearchResult } from './index-fund.filters';
import type {
  FmpCountryWeighting,
  FmpFundHolding,
  FmpFundProfile,
  FmpHistoricalPrice,
  FmpSearchResult,
  FmpSectorWeighting,
} from './financial-modeling-prep.raw.schemas';

/**
 * Extracts a benchmark label from an index fund name when possible.
 *
 * @param name - Fund display name.
 * @returns Benchmark label or `undefined`.
 */
export function extractBenchmarkFromName(name: string): string | undefined {
  const patterns: readonly {
    readonly pattern: RegExp;
    readonly label: string;
  }[] = [
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
    isin: profile.isin?.trim().toUpperCase(),
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
 * Resolves the snapshot date for a composition payload.
 *
 * @param rawHoldings - Raw provider holdings used to detect provider update dates.
 * @returns ISO date string for the composition snapshot.
 */
export function resolveIndexFundCompositionAsOf(
  rawHoldings: readonly FmpFundHolding[],
): string {
  const updatedDates = rawHoldings
    .map((holding) => holding.updated)
    .filter(
      (value): value is string =>
        typeof value === 'string' && value.trim().length > 0,
    )
    .sort();

  if (updatedDates.length > 0) {
    return updatedDates[updatedDates.length - 1];
  }

  return new Date().toISOString().slice(0, 10);
}

/**
 * Maps a raw FMP weight field to a percentage in the 0-100 range.
 *
 * @param weighting - Raw sector or country weighting row.
 * @returns Normalized percentage or `null` when no weight is available.
 */
function normalizeWeightPercentage(weighting: {
  readonly weightPercentage?: number;
  readonly weight?: number;
}): number | null {
  const rawWeight = weighting.weightPercentage ?? weighting.weight;

  if (rawWeight === undefined || Number.isNaN(rawWeight)) {
    return null;
  }

  if (rawWeight > 0 && rawWeight <= 1) {
    return rawWeight * 100;
  }

  return rawWeight;
}

/**
 * Maps raw FMP sector weightings to normalized sector rows.
 *
 * @param weightings - Raw FMP sector weightings.
 * @returns Normalized sector weightings sorted by weight descending.
 */
export function normalizeIndexFundSectorWeightings(
  weightings: readonly FmpSectorWeighting[],
): IndexFundSectorWeighting[] {
  return weightings
    .map((weighting) => {
      const weightPercentage = normalizeWeightPercentage(weighting);

      if (weightPercentage === null || weightPercentage <= 0) {
        return null;
      }

      return indexFundSectorWeightingSchema.parse({
        sector: weighting.sector.trim(),
        weightPercentage,
      });
    })
    .filter(
      (weighting): weighting is IndexFundSectorWeighting => weighting !== null,
    )
    .sort((left, right) => right.weightPercentage - left.weightPercentage);
}

/**
 * Maps raw FMP country weightings to normalized country rows.
 *
 * @param weightings - Raw FMP country weightings.
 * @returns Normalized country weightings sorted by weight descending.
 */
export function normalizeIndexFundCountryWeightings(
  weightings: readonly FmpCountryWeighting[],
): IndexFundCountryWeighting[] {
  return weightings
    .map((weighting) => {
      const weightPercentage = normalizeWeightPercentage(weighting);

      if (weightPercentage === null || weightPercentage <= 0) {
        return null;
      }

      return indexFundCountryWeightingSchema.parse({
        country: weighting.country.trim(),
        weightPercentage,
      });
    })
    .filter(
      (weighting): weighting is IndexFundCountryWeighting => weighting !== null,
    )
    .sort((left, right) => right.weightPercentage - left.weightPercentage);
}

/**
 * Builds a normalized composition snapshot from provider holdings and weightings.
 *
 * @param rawHoldings - Raw FMP fund holdings.
 * @param sectorWeightings - Raw FMP sector weightings.
 * @param countryWeightings - Raw FMP country weightings.
 * @returns Normalized composition snapshot.
 */
export function buildIndexFundComposition(
  rawHoldings: readonly FmpFundHolding[],
  sectorWeightings: readonly FmpSectorWeighting[],
  countryWeightings: readonly FmpCountryWeighting[],
): IndexFundComposition {
  return indexFundCompositionSchema.parse({
    asOf: resolveIndexFundCompositionAsOf(rawHoldings),
    holdings: normalizeIndexFundHoldings(rawHoldings),
    sectorWeightings: normalizeIndexFundSectorWeightings(sectorWeightings),
    countryWeightings: normalizeIndexFundCountryWeightings(countryWeightings),
  });
}

/**
 * Maps raw FMP fund holdings to normalized holding rows.
 *
 * @param holdings - Raw FMP fund holdings.
 * @returns Normalized holdings sorted by weight descending.
 */
export function normalizeIndexFundHoldings(
  holdings: readonly FmpFundHolding[],
): IndexFundHolding[] {
  return holdings
    .map((holding) => {
      const name = holding.name ?? holding.asset;

      if (name === undefined || name.trim() === '') {
        return null;
      }

      return indexFundHoldingSchema.parse({
        asset: holding.asset,
        name,
        isin: holding.isin,
        weightPercentage: holding.weightPercentage ?? 0,
        marketValue: holding.marketValue,
        sharesNumber: holding.sharesNumber,
      });
    })
    .filter((holding): holding is IndexFundHolding => holding !== null)
    .sort((left, right) => right.weightPercentage - left.weightPercentage);
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
    throw new Error(
      'Cannot build price summary from an empty historical series',
    );
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
