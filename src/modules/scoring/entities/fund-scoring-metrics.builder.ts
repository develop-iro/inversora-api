import type { FundAllocation } from '../../funds/entities/fund-composition.schema';
import type { FundHolding } from '../../funds/entities/fund-composition.schema';
import type { FundPrice } from '../../funds/entities/fund-price.schema';
import type { Fund, FundMetrics } from '../../funds/entities/fund.schema';
import type { FundScoringMetrics } from './invesora-score.schema';

const DAYS_PER_YEAR = 365;

/**
 * Computes the total return percentage between two price observations.
 *
 * @param startClose - Starting close price.
 * @param endClose - Ending close price.
 */
export function computeTotalReturnPercent(
  startClose: number,
  endClose: number,
): number {
  if (startClose === 0) {
    return 0;
  }

  return ((endClose - startClose) / startClose) * 100;
}

/**
 * Annualizes a total return over a number of days.
 *
 * @param totalReturnPercent - Total return percentage over the window.
 * @param days - Number of days in the window.
 */
export function annualizeReturnPercent(
  totalReturnPercent: number,
  days: number,
): number {
  if (days <= 0) {
    return totalReturnPercent;
  }

  const growthFactor = 1 + totalReturnPercent / 100;

  if (growthFactor <= 0) {
    return totalReturnPercent;
  }

  return (Math.pow(growthFactor, DAYS_PER_YEAR / days) - 1) * 100;
}

/**
 * Finds the close price closest to the requested lookback in days.
 *
 * @param prices - Price rows ordered by date ascending.
 * @param lookbackDays - Number of days to look back from the latest price.
 */
export function findPriceAtLookback(
  prices: readonly FundPrice[],
  lookbackDays: number,
): FundPrice | null {
  if (prices.length === 0) {
    return null;
  }

  const latest = prices.at(-1);

  if (!latest) {
    return null;
  }

  const latestDate = new Date(`${latest.date}T00:00:00.000Z`);
  const targetTime =
    latestDate.getTime() - lookbackDays * 24 * 60 * 60 * 1000;

  let closest: FundPrice | null = null;
  let closestDistance = Number.POSITIVE_INFINITY;

  for (const price of prices) {
    const priceTime = new Date(`${price.date}T00:00:00.000Z`).getTime();
    const distance = Math.abs(priceTime - targetTime);

    if (priceTime <= latestDate.getTime() && distance < closestDistance) {
      closest = price;
      closestDistance = distance;
    }
  }

  return closest;
}

/**
 * Derives annualized 1Y and 3Y returns from persisted price history.
 *
 * @param prices - Price rows ordered by date ascending.
 */
export function deriveReturnsFromPrices(prices: readonly FundPrice[]): {
  return1Y: number | null;
  return3Y: number | null;
} {
  const latest = prices.at(-1);

  if (!latest) {
    return { return1Y: null, return3Y: null };
  }

  const deriveForLookback = (lookbackDays: number): number | null => {
    const start = findPriceAtLookback(prices, lookbackDays);

    if (!start) {
      return null;
    }

    const startDate = new Date(`${start.date}T00:00:00.000Z`);
    const endDate = new Date(`${latest.date}T00:00:00.000Z`);
    const elapsedDays = Math.max(
      1,
      Math.round((endDate.getTime() - startDate.getTime()) / (24 * 60 * 60 * 1000)),
    );
    const totalReturn = computeTotalReturnPercent(start.close, latest.close);

    return annualizeReturnPercent(totalReturn, elapsedDays);
  };

  return {
    return1Y: deriveForLookback(DAYS_PER_YEAR),
    return3Y: deriveForLookback(DAYS_PER_YEAR * 3),
  };
}

/**
 * Computes the combined weight of the top 10 holdings.
 *
 * @param holdings - Ranked holdings for a portfolio snapshot.
 */
export function computeTop10Weight(holdings: readonly FundHolding[]): number | null {
  if (holdings.length === 0) {
    return null;
  }

  return holdings
    .slice(0, 10)
    .reduce((total, holding) => total + holding.weightPercentage, 0);
}

/**
 * Returns the largest sector weight from allocation slices.
 *
 * @param sectors - Sector allocation rows.
 */
export function computeMaxSectorWeight(
  sectors: readonly Pick<FundAllocation, 'weight'>[],
): number | null {
  if (sectors.length === 0) {
    return null;
  }

  return Math.max(...sectors.map((sector) => sector.weight));
}

/**
 * Estimates fund age in whole years from inception date or oldest price.
 *
 * @param inceptionDate - Optional provider inception date (`YYYY-MM-DD`).
 * @param oldestPriceDate - Oldest persisted price date (`YYYY-MM-DD`).
 */
export function estimateFundAgeYears(
  inceptionDate?: string | null,
  oldestPriceDate?: string | null,
): number | null {
  const referenceDate = inceptionDate ?? oldestPriceDate;

  if (!referenceDate) {
    return null;
  }

  const start = new Date(`${referenceDate}T00:00:00.000Z`);
  const now = new Date();
  const elapsedMs = now.getTime() - start.getTime();

  if (elapsedMs <= 0) {
    return 0;
  }

  return Math.floor(elapsedMs / (DAYS_PER_YEAR * 24 * 60 * 60 * 1000));
}

/**
 * Builds the extended scoring metrics object from fund data and optional snapshots.
 */
export function buildFundScoringMetrics(input: {
  metrics: FundMetrics;
  prices?: readonly FundPrice[];
  holdings?: readonly FundHolding[];
  sectors?: readonly Pick<FundAllocation, 'weight'>[];
  inceptionDate?: string | null;
}): FundScoringMetrics {
  const prices = input.prices ?? [];
  const returns = deriveReturnsFromPrices(prices);

  return {
    ...input.metrics,
    ...returns,
    holdingsCount: input.holdings?.length ?? null,
    top10Weight: input.holdings ? computeTop10Weight(input.holdings) : null,
    maxSectorWeight: input.sectors
      ? computeMaxSectorWeight(input.sectors)
      : null,
    fundAgeYears: estimateFundAgeYears(
      input.inceptionDate,
      prices[0]?.date ?? null,
    ),
  };
}

/**
 * Groups funds by benchmark (preferred) or category for peer-relative scoring.
 *
 * @param funds - Funds to group.
 */
export function resolveScoringPeerGroupKey(fund: Fund): string {
  return fund.benchmark?.trim().toLowerCase() ?? fund.category;
}
