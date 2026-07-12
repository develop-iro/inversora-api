import {
  providerFundCompositionSchema,
  providerFundCountryWeightingSchema,
  providerFundDetailSchema,
  providerFundHistoricalPriceSchema,
  providerFundHoldingSchema,
  providerFundPriceSummarySchema,
  providerFundProfileSchema,
  providerFundQuoteSchema,
  providerFundSearchResultSchema,
  providerFundSectorWeightingSchema,
  providerNewsArticleSchema,
} from './financial-modeling-prep.domain.schemas';
import type {
  ProviderFundComposition,
  ProviderFundCountryWeighting,
  ProviderFundDetail,
  ProviderFundHistoricalPrice,
  ProviderFundHolding,
  ProviderFundPriceSummary,
  ProviderFundProfile,
  ProviderFundQuote,
  ProviderFundSearchResult,
  ProviderFundSectorWeighting,
  ProviderNewsArticle,
} from './financial-modeling-prep.domain.schemas';
import { resolveFundVehicleFromFmpMetadata } from './fund-vehicle.resolver';
import { isIndexedProductSearchResult } from './indexed-product.filters';
import type {
  FmpCountryWeighting,
  FmpFundHolding,
  FmpFundProfile,
  FmpHistoricalPrice,
  FmpNewsArticle,
  FmpQuote,
  FmpQuoteShort,
  FmpSearchResult,
  FmpSectorWeighting,
} from './financial-modeling-prep.raw.schemas';

/**
 * Extracts a benchmark label from a fund name when possible.
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
 * Extracts a benchmark label from an FMP fund description when present.
 *
 * @param description - Provider fund description text.
 * @returns Benchmark label or `undefined`.
 */
export function extractBenchmarkFromDescription(
  description: string,
): string | undefined {
  const normalized = description.trim();

  if (normalized.length === 0) {
    return undefined;
  }

  const indexMatch = normalized.match(
    /\b(?:replicat(?:e|es|ing)|track(?:s|ing)?)\s+(?:the\s+)?([^.,;]+?\bindex)\b/i,
  );

  if (indexMatch?.[1] !== undefined) {
    return indexMatch[1].trim();
  }

  const namedIndexMatch = normalized.match(
    /\b([A-Z][A-Za-z0-9&'./\-\s]{2,80}\bIndex)\b/,
  );

  return namedIndexMatch?.[1]?.trim();
}

/**
 * Derives a catalog benchmark label from the fund name when heuristics fail.
 *
 * @param name - Fund display name.
 * @returns Human-readable benchmark label.
 */
export function deriveBenchmarkLabelFromName(name: string): string {
  const withoutEtfSuffix = name.replace(/\s+ETF\b.*$/i, '').trim();
  const cleaned = withoutEtfSuffix.length > 0 ? withoutEtfSuffix : name.trim();

  return cleaned.length > 0 ? cleaned : 'Broad Market Index';
}

/**
 * Resolves the best available benchmark label for catalog and scoring grouping.
 *
 * @param name - Fund display name.
 * @param description - Optional provider description.
 * @returns Benchmark label.
 */
export function resolveFundBenchmark(
  name: string,
  description?: string,
): string {
  return (
    extractBenchmarkFromName(name) ??
    (description === undefined
      ? undefined
      : extractBenchmarkFromDescription(description)) ??
    deriveBenchmarkLabelFromName(name)
  );
}

/**
 * Maps a raw FMP search result to the normalized provider fund search shape.
 *
 * @param result - Raw FMP search result.
 * @returns Normalized provider fund search result.
 */
export function normalizeProviderFundSearchResult(
  result: FmpSearchResult,
): ProviderFundSearchResult {
  const exchange = result.exchangeShortName ?? result.exchange;

  return providerFundSearchResultSchema.parse({
    symbol: result.symbol,
    name: result.name,
    vehicle: resolveFundVehicleFromFmpMetadata({
      name: result.name,
      exchange,
    }),
    currency: result.currency,
    exchange,
    exchangeFullName: result.exchangeFullName ?? result.stockExchange,
  });
}

/**
 * Maps raw FMP search results to normalized provider fund search results.
 *
 * @param results - Raw FMP search results.
 * @returns Normalized provider fund search results.
 */
export function normalizeProviderFundSearchResults(
  results: readonly FmpSearchResult[],
): ProviderFundSearchResult[] {
  return results
    .filter(isIndexedProductSearchResult)
    .map((result) => normalizeProviderFundSearchResult(result));
}

/**
 * Maps a raw FMP fund profile to the normalized provider fund profile shape.
 *
 * @param profile - Raw FMP fund profile.
 * @param searchResult - Optional search metadata used to enrich the profile.
 * @returns Normalized provider fund profile.
 */
export function normalizeProviderFundProfile(
  profile: FmpFundProfile,
  searchResult?: FmpSearchResult,
): ProviderFundProfile {
  const name = profile.name ?? searchResult?.name ?? profile.symbol;
  const exchange = searchResult?.exchangeShortName ?? searchResult?.exchange;

  return providerFundProfileSchema.parse({
    symbol: profile.symbol,
    name,
    vehicle: resolveFundVehicleFromFmpMetadata({
      name,
      exchange,
    }),
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
    exchange,
    exchangeFullName:
      searchResult?.exchangeFullName ?? searchResult?.stockExchange,
    benchmark: resolveFundBenchmark(name, profile.description),
  });
}

/**
 * Builds a partial provider fund profile from a search result.
 *
 * @param searchResult - Raw FMP search result.
 * @returns Normalized provider fund profile with search-derived fields only.
 */
export function normalizeProviderFundProfileFromSearch(
  searchResult: FmpSearchResult,
): ProviderFundProfile {
  const exchange = searchResult.exchangeShortName ?? searchResult.exchange;

  return providerFundProfileSchema.parse({
    symbol: searchResult.symbol,
    name: searchResult.name,
    vehicle: resolveFundVehicleFromFmpMetadata({
      name: searchResult.name,
      exchange,
    }),
    currency: searchResult.currency,
    exchange,
    exchangeFullName:
      searchResult.exchangeFullName ?? searchResult.stockExchange,
    benchmark: resolveFundBenchmark(searchResult.name),
  });
}

/**
 * Maps raw FMP historical prices to normalized price points.
 *
 * @param prices - Raw FMP historical prices.
 * @returns Normalized historical prices sorted by date descending.
 */
export function normalizeProviderFundHistoricalPrices(
  prices: readonly FmpHistoricalPrice[],
): ProviderFundHistoricalPrice[] {
  return prices
    .map((price) =>
      providerFundHistoricalPriceSchema.parse({
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
export function resolveProviderFundCompositionAsOf(
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

type WeightScale = 'percent' | 'fraction';

/**
 * Detects whether a batch of `weight` fields is expressed as fractions (0–1) or percentages.
 *
 * @param rawWeights - Raw `weight` field values from a single exposure snapshot.
 */
export function detectWeightScale(rawWeights: readonly number[]): WeightScale {
  const positiveWeights = rawWeights.filter((weight) => weight > 0);

  if (positiveWeights.length === 0) {
    return 'percent';
  }

  const maxWeight = Math.max(...positiveWeights);
  const totalWeight = positiveWeights.reduce(
    (total, weight) => total + weight,
    0,
  );

  if (maxWeight <= 1 && totalWeight >= 0.9 && totalWeight <= 1.1) {
    return 'fraction';
  }

  return 'percent';
}

/**
 * Maps a raw FMP weight field to a percentage in the 0–100 range.
 *
 * @param weighting - Raw sector or country weighting row.
 * @param weightFieldScale - Detected scale for rows that only expose `weight`.
 * @returns Normalized percentage or `null` when no weight is available.
 */
function normalizeWeightPercentage(
  weighting: {
    readonly weightPercentage?: number;
    readonly weight?: number;
  },
  weightFieldScale: WeightScale,
): number | null {
  if (
    weighting.weightPercentage !== undefined &&
    !Number.isNaN(weighting.weightPercentage)
  ) {
    if (weighting.weightPercentage <= 0) {
      return null;
    }

    return weighting.weightPercentage;
  }

  if (weighting.weight === undefined || Number.isNaN(weighting.weight)) {
    return null;
  }

  if (weighting.weight <= 0) {
    return null;
  }

  if (weightFieldScale === 'fraction') {
    return weighting.weight * 100;
  }

  if (weighting.weight > 0 && weighting.weight <= 1) {
    return weighting.weight * 100;
  }

  return weighting.weight;
}

/**
 * Maps raw FMP sector weightings to normalized sector rows.
 *
 * @param weightings - Raw FMP sector weightings.
 * @returns Normalized sector weightings sorted by weight descending.
 */
export function normalizeProviderFundSectorWeightings(
  weightings: readonly FmpSectorWeighting[],
): ProviderFundSectorWeighting[] {
  const weightFieldScale = detectWeightScale(
    weightings
      .map((weighting) => weighting.weight)
      .filter((weight): weight is number => weight !== undefined),
  );

  return weightings
    .map((weighting) => {
      const weightPercentage = normalizeWeightPercentage(
        weighting,
        weightFieldScale,
      );

      if (weightPercentage === null || weightPercentage <= 0) {
        return null;
      }

      return providerFundSectorWeightingSchema.parse({
        sector: weighting.sector.trim(),
        weightPercentage,
      });
    })
    .filter(
      (weighting): weighting is ProviderFundSectorWeighting =>
        weighting !== null,
    )
    .sort((left, right) => right.weightPercentage - left.weightPercentage);
}

/**
 * Maps raw FMP country weightings to normalized country rows.
 *
 * @param weightings - Raw FMP country weightings.
 * @returns Normalized country weightings sorted by weight descending.
 */
export function normalizeProviderFundCountryWeightings(
  weightings: readonly FmpCountryWeighting[],
): ProviderFundCountryWeighting[] {
  const weightFieldScale = detectWeightScale(
    weightings
      .map((weighting) => weighting.weight)
      .filter((weight): weight is number => weight !== undefined),
  );

  return weightings
    .map((weighting) => {
      const weightPercentage = normalizeWeightPercentage(
        weighting,
        weightFieldScale,
      );

      if (weightPercentage === null || weightPercentage <= 0) {
        return null;
      }

      return providerFundCountryWeightingSchema.parse({
        country: weighting.country.trim(),
        weightPercentage,
      });
    })
    .filter(
      (weighting): weighting is ProviderFundCountryWeighting =>
        weighting !== null,
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
export function buildProviderFundComposition(
  rawHoldings: readonly FmpFundHolding[],
  sectorWeightings: readonly FmpSectorWeighting[],
  countryWeightings: readonly FmpCountryWeighting[],
): ProviderFundComposition {
  return providerFundCompositionSchema.parse({
    asOf: resolveProviderFundCompositionAsOf(rawHoldings),
    holdings: normalizeProviderFundHoldings(rawHoldings),
    sectorWeightings: normalizeProviderFundSectorWeightings(sectorWeightings),
    countryWeightings:
      normalizeProviderFundCountryWeightings(countryWeightings),
  });
}

/**
 * Maps raw FMP fund holdings to normalized holding rows.
 *
 * @param holdings - Raw FMP fund holdings.
 * @returns Normalized holdings sorted by weight descending.
 */
export function normalizeProviderFundHoldings(
  holdings: readonly FmpFundHolding[],
): ProviderFundHolding[] {
  return holdings
    .map((holding) => {
      const name = holding.name ?? holding.asset;

      if (name === undefined || name.trim() === '') {
        return null;
      }

      return providerFundHoldingSchema.parse({
        asset: holding.asset,
        name,
        isin: holding.isin,
        weightPercentage: holding.weightPercentage ?? 0,
        marketValue: holding.marketValue,
        sharesNumber: holding.sharesNumber,
      });
    })
    .filter((holding): holding is ProviderFundHolding => holding !== null)
    .sort((left, right) => right.weightPercentage - left.weightPercentage);
}

/**
 * Builds derived price statistics from a normalized historical series.
 *
 * @param prices - Normalized historical prices sorted by date descending.
 * @returns Derived price summary for the provided window.
 * @throws {Error} When the historical series is empty.
 */
export function buildProviderFundPriceSummary(
  prices: readonly ProviderFundHistoricalPrice[],
): ProviderFundPriceSummary {
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

  return providerFundPriceSummarySchema.parse({
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
 * Builds the normalized provider fund detail aggregate.
 *
 * @param profile - Normalized provider fund profile.
 * @param prices - Normalized historical prices.
 * @param includeHistory - Whether to include the full historical series.
 * @returns Provider fund detail aggregate.
 */
export function buildProviderFundDetail(
  profile: ProviderFundProfile,
  prices: readonly ProviderFundHistoricalPrice[],
  includeHistory = false,
): ProviderFundDetail {
  return providerFundDetailSchema.parse({
    ...profile,
    priceSummary: buildProviderFundPriceSummary(prices),
    history: includeHistory ? [...prices] : undefined,
  });
}

/**
 * Extracts the `YYYY-MM-DD` date part from an FMP news timestamp.
 *
 * @param publishedDate - Raw timestamp such as `2026-07-12 10:40:44`.
 * @returns ISO date or `undefined` when the value has no valid date prefix.
 */
function extractNewsPublishedDate(publishedDate: string): string | undefined {
  const match = publishedDate.trim().match(/^(\d{4}-\d{2}-\d{2})/);

  return match?.[1];
}

/**
 * Maps a raw FMP news article to the normalized provider news shape.
 *
 * Articles without title, summary text, HTTPS link, or a parseable date are
 * discarded so the BFF never serves incomplete headlines.
 *
 * @param article - Raw FMP news article row.
 * @returns Normalized article or `null` when required fields are missing.
 */
export function normalizeProviderNewsArticle(
  article: FmpNewsArticle,
): ProviderNewsArticle | null {
  const title = article.title.trim();
  const summary = article.text?.trim() ?? '';
  const url = article.url.trim();
  const publishedAt = extractNewsPublishedDate(article.publishedDate);
  const source = article.publisher?.trim() || article.site?.trim() || '';

  if (
    title.length === 0 ||
    summary.length === 0 ||
    source.length === 0 ||
    publishedAt === undefined ||
    !url.startsWith('https://')
  ) {
    return null;
  }

  const parsed = providerNewsArticleSchema.safeParse({
    title,
    summary,
    source,
    publishedAt,
    url,
  });

  return parsed.success ? parsed.data : null;
}

/**
 * Maps raw FMP news articles to normalized provider news articles.
 *
 * @param articles - Raw FMP news article rows.
 * @returns Normalized articles sorted by published date descending.
 */
export function normalizeProviderNewsArticles(
  articles: readonly FmpNewsArticle[],
): ProviderNewsArticle[] {
  return articles
    .map((article) => normalizeProviderNewsArticle(article))
    .filter((article): article is ProviderNewsArticle => article !== null)
    .sort((left, right) => right.publishedAt.localeCompare(left.publishedAt));
}

/**
 * Resolves a day change percentage from raw FMP quote fields.
 *
 * FMP `quote-short` returns `change` but not `changePercentage`; the full `quote`
 * endpoint exposes `changePercentage` and `previousClose`.
 *
 * @param input - Raw quote fields.
 */
export function resolveQuoteChangePercent(input: {
  price: number;
  change?: number;
  changePercent?: number;
  changesPercentage?: number;
  previousClose?: number;
}): number | null {
  if (input.changePercent !== undefined) {
    return input.changePercent;
  }

  if (input.changesPercentage !== undefined) {
    return input.changesPercentage;
  }

  if (
    input.previousClose !== undefined &&
    input.previousClose !== 0 &&
    input.change !== undefined
  ) {
    return (input.change / input.previousClose) * 100;
  }

  if (input.change === undefined) {
    return null;
  }

  const previousClose = input.price - input.change;

  if (previousClose === 0) {
    return null;
  }

  return (input.change / previousClose) * 100;
}

/**
 * Converts an FMP quote timestamp into an ISO datetime string.
 *
 * @param timestamp - Unix timestamp in seconds or milliseconds.
 */
export function resolveQuoteAsOf(timestamp?: number): string {
  if (timestamp === undefined) {
    return new Date().toISOString();
  }

  const milliseconds =
    timestamp > 1_000_000_000_000 ? timestamp : timestamp * 1000;

  return new Date(milliseconds).toISOString();
}

/**
 * Normalizes a raw FMP quote row into a provider quote snapshot.
 *
 * @param quote - Raw FMP full quote row.
 * @returns Normalized provider quote snapshot.
 */
export function normalizeProviderFundFullQuote(
  quote: FmpQuote,
): ProviderFundQuote {
  return providerFundQuoteSchema.parse({
    symbol: quote.symbol,
    price: quote.price,
    changePercent: resolveQuoteChangePercent({
      price: quote.price,
      change: quote.change,
      changePercent: quote.changePercentage,
      changesPercentage: quote.changesPercentage,
      previousClose: quote.previousClose,
    }),
    volume: quote.volume ?? null,
    asOf: resolveQuoteAsOf(quote.timestamp),
  });
}

/**
 * Normalizes a raw FMP quote-short row into a provider quote snapshot.
 *
 * @param quote - Raw FMP quote-short row.
 * @returns Normalized provider quote snapshot.
 */
export function normalizeProviderFundQuote(
  quote: FmpQuoteShort,
): ProviderFundQuote {
  return providerFundQuoteSchema.parse({
    symbol: quote.symbol,
    price: quote.price,
    changePercent: resolveQuoteChangePercent({
      price: quote.price,
      change: quote.change,
      changesPercentage: quote.changesPercentage,
    }),
    volume: quote.volume ?? null,
    asOf: new Date().toISOString(),
  });
}
