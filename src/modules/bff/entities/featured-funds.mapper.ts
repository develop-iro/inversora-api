import type { Fund } from '../../funds/entities/fund.schema';
import { resolveIdealForBeginners } from '../../funds/entities/fund-editorial.utils';
import {
  buildCategoryLabel,
  mapRiskLevelToApp,
  resolveDiversificationLevel,
} from './fund-detail.mapper';
import type {
  FeaturedFundEditorial,
  FeaturedFundsQuery,
  FeaturedFundsResponse,
} from './featured-funds.schema';
import { featuredFundsResponseSchema } from './featured-funds.schema';
import type { QuarterMetadata } from './quarter-metadata.utils';
import { resolveQuarterFromQuery } from './quarter-metadata.utils';

/** Fund record paired with its editorial selection metadata. */
export type FeaturedFundHydrationInput = {
  fund: Fund;
  editorial: FeaturedFundEditorial;
  quarter: QuarterMetadata;
};

/**
 * Maps a persisted fund and editorial config to a featured fund card payload.
 *
 * @param input - Hydrated fund, editorial copy, and quarter metadata.
 */
export function mapFundToFeaturedFund(
  input: FeaturedFundHydrationInput,
): FeaturedFundsResponse['data'][number] {
  const { fund, editorial, quarter } = input;
  const terPercent = fund.metrics.ter ?? 0;
  const riskLevel = mapRiskLevelToApp(fund.riskLevel);
  const efficiencyScore = Math.round(fund.score ?? 0);

  return {
    id: fund.id,
    isin: fund.isin ?? editorial.isin,
    name: fund.name,
    vehicleType: fund.vehicle,
    categoryLabel: buildCategoryLabel(fund),
    themeLabel: editorial.themeLabel || fund.editorial.themeLabel,
    badge: editorial.badge || fund.editorial.badge,
    idealForBeginners: resolveIdealForBeginners(fund),
    efficiencyScore,
    terPercent,
    riskLevel,
    diversification: resolveDiversificationLevel([]),
    quarterTag: quarter.quarterTag,
    periodStart: quarter.periodStart,
    periodEnd: quarter.periodEnd,
    benefitSummary: editorial.benefitSummary,
    featuredReason: editorial.featuredReason,
    isFeatured: true,
  };
}

/**
 * Applies optional benchmark and mercado filters to hydrated featured funds.
 *
 * @param funds - Featured funds already mapped to the mobile contract.
 * @param query - Parsed featured funds query.
 */
export function filterFeaturedFunds(
  funds: FeaturedFundsResponse['data'],
  query: FeaturedFundsQuery,
): FeaturedFundsResponse['data'] {
  let filtered = funds;

  if (query.benchmark !== undefined) {
    const benchmarkNeedle = query.benchmark.trim().toLowerCase();
    filtered = filtered.filter((fund) =>
      fund.categoryLabel.toLowerCase().includes(benchmarkNeedle),
    );
  }

  if (query.mercado !== undefined) {
    const marketNeedle = query.mercado.trim().toLowerCase();
    filtered = filtered.filter((fund) => {
      const category = fund.categoryLabel.toLowerCase();
      const theme = fund.themeLabel.toLowerCase();

      if (marketNeedle === 'usa' || marketNeedle === 'us') {
        return (
          category.includes('usa') ||
          theme.includes('usa') ||
          category.includes('s&p') ||
          theme.includes('s&p') ||
          fund.name.toLowerCase().includes('s&p')
        );
      }

      if (marketNeedle === 'europa' || marketNeedle === 'europe') {
        return category.includes('europa') || theme.includes('europa');
      }

      if (marketNeedle === 'global') {
        return category.includes('global') || theme.includes('global');
      }

      return (
        category.includes(marketNeedle) ||
        theme.includes(marketNeedle) ||
        fund.name.toLowerCase().includes(marketNeedle)
      );
    });
  }

  if (query.limit !== undefined) {
    return filtered.slice(0, query.limit);
  }

  return filtered;
}

/**
 * Builds the featured funds HTTP response envelope.
 *
 * @param quarter - Resolved quarter metadata.
 * @param funds - Featured fund card payloads.
 */
export function buildFeaturedFundsResponse(
  quarter: QuarterMetadata,
  funds: FeaturedFundsResponse['data'],
): FeaturedFundsResponse {
  return featuredFundsResponseSchema.parse({
    quarter: quarter.quarterKey,
    quarterTag: quarter.quarterTag,
    periodStart: quarter.periodStart,
    periodEnd: quarter.periodEnd,
    data: funds,
  });
}

/**
 * Parses and validates the optional quarter query parameter.
 *
 * @param rawQuarter - Raw `quarter` query value.
 */
export function parseFeaturedQuarterQuery(
  rawQuarter?: string,
): QuarterMetadata {
  try {
    return resolveQuarterFromQuery(rawQuarter);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Invalid quarter parameter';
    throw new FeaturedQuarterParseError(message);
  }
}

/** Error thrown when the quarter query parameter cannot be parsed. */
export class FeaturedQuarterParseError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'FeaturedQuarterParseError';
  }
}
