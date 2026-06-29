import type { FundAllocation } from '../../funds/entities/fund-composition.schema';
import type { FundHolding } from '../../funds/entities/fund-composition.schema';
import { mapFundCardBranding } from '../../funds/entities/fund-api.mapper';
import {
  mapFundPricesToChartPoints,
  resolveChartDateRange,
} from '../../funds/entities/fund-chart.mapper';
import type { FundChartResponse } from '../../funds/entities/fund-chart.schema';
import type { FundCountryExposureResponse } from '../../funds/entities/fund-country-exposure.schema';
import type { FundHoldingsResponse } from '../../funds/entities/fund-holdings.schema';
import { formatFundPriceDate } from '../../funds/entities/fund-price.mapper';
import type { FundPrice } from '../../funds/entities/fund-price.schema';
import type { FundSectorExposureResponse } from '../../funds/entities/fund-sector-exposure.schema';
import type { Fund } from '../../funds/entities/fund.schema';
import {
  mapRiskLevelToApp,
  resolveEditorialLabels,
  resolveIdealForBeginners,
} from '../../funds/entities/fund-editorial.utils';
import {
  buildBenefitSummary,
  buildCategoryLabel,
  buildProductDescription,
  buildVehicleLabel,
} from '../../funds/entities/fund-vehicle.utils';
import {
  computeTotalReturnPercent,
  findPriceAtLookback,
} from '../../scoring/entities/fund-scoring-metrics.builder';
import type { InvesoraScore } from '../../scoring/entities/invesora-score.schema';
import {
  fundDetailResponseSchema,
  type AllocationSlice,
  type FundDetailPerformanceTimeframe,
  type FundDetailProfile,
  type FundDetailResponse,
  type FundMarketSnapshot,
  type ScoreCriterionResult,
} from './fund-detail.schema';
import {
  buildQuarterMetadata,
  resolveCurrentQuarterParts,
} from './quarter-metadata.utils';

export { mapRiskLevelToApp } from '../../funds/entities/fund-editorial.utils';
export {
  buildCategoryLabel,
  buildVehicleLabel,
} from '../../funds/entities/fund-vehicle.utils';

const DATA_SOURCE_LABEL = 'Financial Modeling Prep';

const APP_SCORE_CRITERIA: readonly {
  id: ScoreCriterionResult['id'];
  label: string;
  maxPoints: number;
}[] = [
  { id: 'ter', label: 'Comisión (TER)', maxPoints: 40 },
  { id: 'tracking', label: 'Tracking error', maxPoints: 40 },
  { id: 'aum', label: 'Patrimonio (AUM)', maxPoints: 10 },
  { id: 'age', label: 'Antigüedad del fondo', maxPoints: 10 },
  { id: 'consistency', label: 'Consistencia histórica', maxPoints: 1 },
  { id: 'dataQuality', label: 'Calidad de datos', maxPoints: 1 },
];

const SECTOR_ICON_BY_LABEL: Readonly<Record<string, string>> = {
  technology: 'laptop',
  tecnología: 'laptop',
  financial: 'bank',
  financiero: 'bank',
  healthcare: 'medical-bag',
  salud: 'medical-bag',
  energy: 'lightning-bolt',
  energía: 'lightning-bolt',
};

/** Raw data required to build an aggregated fund detail response. */
export type FundDetailBuildInput = {
  fund: Fund;
  score: InvesoraScore;
  rank?: number;
  brandfetchClientId?: string;
  charts: Record<'1Y' | '3Y' | '5Y', FundChartResponse>;
  ytdPrices: readonly FundPrice[];
  maxPrices: readonly FundPrice[];
  allPrices: readonly FundPrice[];
  countries: FundCountryExposureResponse;
  sectors: FundSectorExposureResponse;
  holdings: FundHoldingsResponse;
  allocationsByCategory: Partial<
    Record<
      'regional' | 'assetAllocation' | 'capitalization',
      readonly FundAllocation[]
    >
  >;
};

/**
 * Maps RN-04 score breakdown to the six app criteria rows.
 *
 * RN-04 contributes four scored factors; `consistency` and `dataQuality` are
 * placeholders so the mobile client keeps a stable six-row layout.
 *
 * @param score - Computed Inversora Score payload.
 */
export function mapScoreBreakdownToApp(
  score: InvesoraScore,
): ScoreCriterionResult[] {
  return [
    {
      id: 'ter',
      label: APP_SCORE_CRITERIA[0].label,
      points: score.breakdown.ter.points,
      maxPoints: score.breakdown.ter.maxPoints,
    },
    {
      id: 'tracking',
      label: APP_SCORE_CRITERIA[1].label,
      points: score.breakdown.tracking.points,
      maxPoints: score.breakdown.tracking.maxPoints,
    },
    {
      id: 'aum',
      label: APP_SCORE_CRITERIA[2].label,
      points: score.breakdown.aum.points,
      maxPoints: score.breakdown.aum.maxPoints,
    },
    {
      id: 'age',
      label: APP_SCORE_CRITERIA[3].label,
      points: score.breakdown.age.points,
      maxPoints: score.breakdown.age.maxPoints,
    },
    {
      id: 'consistency',
      label: APP_SCORE_CRITERIA[4].label,
      points: 0,
      maxPoints: APP_SCORE_CRITERIA[4].maxPoints,
    },
    {
      id: 'dataQuality',
      label: APP_SCORE_CRITERIA[5].label,
      points: 0,
      maxPoints: APP_SCORE_CRITERIA[5].maxPoints,
    },
  ];
}

/**
 * Derives the scoring status exposed to the mobile client.
 *
 * @param score - Computed Inversora Score payload.
 */
export function resolveScoringStatus(
  score: InvesoraScore,
): 'ok' | 'warning' | 'quarantined' {
  const hasIncompleteFactors = Object.values(score.breakdown).some(
    (factor) => factor.incomplete === true,
  );

  if (hasIncompleteFactors || score.warnings.length > 0) {
    return 'warning';
  }

  return 'ok';
}

/**
 * Formats AUM for profile display.
 *
 * @param aum - Assets under management.
 * @param currency - ISO 4217 currency code.
 */
export function formatFundAum(aum: number | null, currency: string): string {
  if (aum === null) {
    return '—';
  }

  if (aum >= 1_000_000_000) {
    return `${(aum / 1_000_000_000).toFixed(1)} B${currency}`;
  }

  if (aum >= 1_000_000) {
    return `${(aum / 1_000_000).toFixed(0)} M${currency}`;
  }

  return `${aum.toFixed(0)} ${currency}`;
}

/**
 * Formats a percentage value for profile tables.
 *
 * @param value - Percentage value.
 */
export function formatPercentValue(value: number | null): string {
  if (value === null) {
    return '—';
  }

  return `${value.toFixed(2).replace('.', ',')} %`;
}

/**
 * Maps allocation rows to app exposure slices.
 *
 * @param allocations - Persisted allocation rows.
 */
export function mapAllocationsToSlices(
  allocations: readonly Pick<FundAllocation, 'label' | 'weight'>[],
): AllocationSlice[] {
  return allocations.map((allocation) => ({
    label: allocation.label,
    percent: Number(allocation.weight.toFixed(2)),
    icon: SECTOR_ICON_BY_LABEL[allocation.label.toLowerCase()],
  }));
}

/**
 * Maps holdings to portfolio exposure slices.
 *
 * @param holdings - Ranked holdings snapshot.
 */
export function mapHoldingsToPortfolioSlices(
  holdings: readonly Pick<FundHolding, 'name' | 'weightPercentage'>[],
): AllocationSlice[] {
  return holdings.slice(0, 10).map((holding) => ({
    label: holding.name,
    percent: Number(holding.weightPercentage.toFixed(2)),
  }));
}

/**
 * Builds a performance series for a chart timeframe.
 *
 * @param timeframe - App timeframe identifier.
 * @param points - Indexed chart points.
 * @param asOf - Latest point date.
 */
export function buildPerformanceSeries(
  timeframe: FundDetailPerformanceTimeframe,
  points: readonly { date: string; value: number }[],
  asOf: string | null,
): FundMarketSnapshot['performanceByTimeframe'][FundDetailPerformanceTimeframe] {
  const resolvedAsOf =
    asOf === null
      ? new Date().toISOString()
      : asOf.includes('T')
        ? asOf
        : `${asOf}T00:00:00.000Z`;

  return {
    timeframe,
    points: points.map((point) => ({
      date: point.date,
      value: point.value,
    })),
    asOf: resolvedAsOf,
    sourceLabel: DATA_SOURCE_LABEL,
  };
}

/**
 * Builds the market snapshot block for the aggregated response.
 *
 * @param input - Chart and exposure data collected by the aggregator.
 */
export function buildMarketSnapshot(input: {
  charts: Record<'1Y' | '3Y' | '5Y', FundChartResponse>;
  ytdPrices: readonly FundPrice[];
  maxPrices: readonly FundPrice[];
  countries: FundCountryExposureResponse;
  volatility: number | null;
}): FundMarketSnapshot {
  const ytdPoints = mapFundPricesToChartPoints(input.ytdPrices);
  const maxPoints = mapFundPricesToChartPoints(input.maxPrices);

  return {
    performanceByTimeframe: {
      ytd: buildPerformanceSeries(
        'ytd',
        ytdPoints,
        ytdPoints.at(-1)?.date ?? null,
      ),
      '1y': buildPerformanceSeries(
        '1y',
        input.charts['1Y'].points,
        input.charts['1Y'].asOf,
      ),
      '3y': buildPerformanceSeries(
        '3y',
        input.charts['3Y'].points,
        input.charts['3Y'].asOf,
      ),
      '5y': buildPerformanceSeries(
        '5y',
        input.charts['5Y'].points,
        input.charts['5Y'].asOf,
      ),
      max: buildPerformanceSeries(
        'max',
        maxPoints,
        maxPoints.at(-1)?.date ?? null,
      ),
    },
    regions: input.countries.countries.map((country) => ({
      label: country.label,
      percent: Number(country.weight.toFixed(2)),
    })),
    stabilityLabel: resolveStabilityLabel(input.volatility),
  };
}

/**
 * Resolves a human-readable stability label from volatility.
 *
 * @param volatility - Annualized volatility percentage.
 */
export function resolveStabilityLabel(volatility: number | null): string {
  if (volatility === null) {
    return 'Volatilidad no disponible';
  }

  if (volatility < 10) {
    return 'Volatilidad baja';
  }

  if (volatility < 18) {
    return 'Volatilidad media';
  }

  return 'Volatilidad alta';
}

/**
 * Computes period returns from a price history.
 *
 * @param prices - Price rows ordered by date ascending.
 */
export function buildReturnsByPeriod(
  prices: readonly FundPrice[],
): FundDetailProfile['returnsByPeriod'] {
  const latest = prices.at(-1);

  if (!latest) {
    return [
      { id: 'ytd', label: 'YTD', percent: null },
      { id: '1y', label: '1 año', percent: null },
      { id: '3y', label: '3 años', percent: null },
      { id: '5y', label: '5 años', percent: null },
    ];
  }

  const yearStart = `${latest.date.slice(0, 4)}-01-01`;
  const ytdStart = prices.find((price) => price.date >= yearStart) ?? latest;
  const oneYear = findPriceAtLookback(prices, 365);
  const threeYear = findPriceAtLookback(prices, 365 * 3);
  const fiveYear = findPriceAtLookback(prices, 365 * 5);

  return [
    {
      id: 'ytd',
      label: 'YTD',
      percent: computeTotalReturnPercent(ytdStart.close, latest.close),
    },
    {
      id: '1y',
      label: '1 año',
      percent:
        oneYear === null
          ? null
          : computeTotalReturnPercent(oneYear.close, latest.close),
    },
    {
      id: '3y',
      label: '3 años',
      percent:
        threeYear === null
          ? null
          : computeTotalReturnPercent(threeYear.close, latest.close),
    },
    {
      id: '5y',
      label: '5 años',
      percent:
        fiveYear === null
          ? null
          : computeTotalReturnPercent(fiveYear.close, latest.close),
    },
  ];
}

/**
 * Computes calendar-year returns from a price history.
 *
 * @param prices - Price rows ordered by date ascending.
 */
export function buildReturnsByYear(
  prices: readonly FundPrice[],
): FundDetailProfile['returnsByYear'] {
  if (prices.length === 0) {
    return [];
  }

  const latest = prices.at(-1)!;
  const latestYear = Number(latest.date.slice(0, 4));
  const years: FundDetailProfile['returnsByYear'] = [];

  for (let year = latestYear; year >= latestYear - 4; year -= 1) {
    const yearStart = prices.find((price) => price.date.startsWith(`${year}-`));
    const nextYearStart = prices.find((price) =>
      price.date.startsWith(`${year + 1}-`),
    );

    if (!yearStart) {
      years.push({ year, percent: null });
      continue;
    }

    const endPrice = nextYearStart ?? (year === latestYear ? latest : null);

    years.push({
      year,
      percent:
        endPrice === null
          ? null
          : computeTotalReturnPercent(yearStart.close, endPrice.close),
    });
  }

  return years;
}

/**
 * Builds ratio rows for a given horizon.
 *
 * @param volatility - Annualized volatility percentage.
 * @param drawdown - Maximum drawdown percentage.
 */
export function buildRatioRows(
  volatility: number | null,
  drawdown: number | null,
): FundDetailProfile['ratiosByHorizon']['12m'] {
  return [
    {
      id: 'volatility',
      label: 'Volatilidad',
      value: formatPercentValue(volatility),
    },
    {
      id: 'drawdown',
      label: 'Caída máxima',
      value: formatPercentValue(drawdown),
    },
  ];
}

/**
 * Resolves diversification level from holdings concentration.
 *
 * @param holdings - Ranked holdings snapshot.
 */
export function resolveDiversificationLevel(
  holdings: readonly Pick<FundHolding, 'weightPercentage'>[],
): 'low' | 'medium' | 'high' {
  if (holdings.length === 0) {
    return 'medium';
  }

  const top10Weight = holdings
    .slice(0, 10)
    .reduce((sum, holding) => sum + holding.weightPercentage, 0);

  if (holdings.length >= 50 && top10Weight < 35) {
    return 'high';
  }

  if (holdings.length >= 20 && top10Weight < 55) {
    return 'medium';
  }

  return 'low';
}

/**
 * Builds the current quarter tag metadata for featured cards.
 */
export function buildCurrentQuarterMetadata(): {
  quarterTag: string;
  periodStart: string;
  periodEnd: string;
} {
  const quarter = buildQuarterMetadata(resolveCurrentQuarterParts());

  return {
    quarterTag: quarter.quarterTag,
    periodStart: quarter.periodStart,
    periodEnd: quarter.periodEnd,
  };
}

/**
 * Builds the aggregated `FundDetail` response from collected domain data.
 *
 * @param input - Raw data required to compose the BFF payload.
 */
export function buildFundDetailResponse(
  input: FundDetailBuildInput,
): FundDetailResponse {
  const { fund, score } = input;
  const inversoraScore = Math.round(score.score);
  const scoredBreakdown = mapScoreBreakdownToApp(score);
  const scoringStatus = resolveScoringStatus(score);
  const quarter = buildCurrentQuarterMetadata();
  const terPercent = fund.metrics.ter ?? 0;
  const riskLevel = mapRiskLevelToApp(fund.riskLevel);
  const { badge, themeLabel } = resolveEditorialLabels(fund);
  const branding = mapFundCardBranding(fund, input.brandfetchClientId);
  const profileAsOf =
    input.holdings.asOf ??
    input.sectors.asOf ??
    input.countries.asOf ??
    input.charts['1Y'].asOf ??
    formatFundPriceDate(new Date());

  const profile: FundDetailProfile = {
    asOf: `${profileAsOf}T00:00:00.000Z`,
    sourceLabel: DATA_SOURCE_LABEL,
    description: buildProductDescription(fund),
    manager: fund.issuer ?? '—',
    benchmark: fund.benchmark ?? '—',
    vehicleType: fund.vehicle,
    tracksIndex: fund.category === 'index',
    fundAum: formatFundAum(fund.metrics.aum, fund.currency),
    inceptionDate:
      input.allPrices[0]?.date !== undefined
        ? input.allPrices[0].date.split('-').reverse().join('/')
        : '—',
    summaryRows: [
      {
        id: 'symbol',
        label: 'Ticker',
        value: fund.symbol,
      },
      {
        id: 'currency',
        label: 'Divisa',
        value: fund.currency,
      },
      {
        id: 'vehicle',
        label: 'Tipo de producto',
        value: buildVehicleLabel(fund.vehicle),
      },
      {
        id: 'category',
        label: 'Categoría',
        value: buildCategoryLabel(fund),
      },
    ],
    feeRows: [
      {
        id: 'ter',
        label: 'TER',
        value: formatPercentValue(terPercent),
      },
    ],
    documents: [
      {
        id: 'kiid',
        label: 'KIID',
        status: 'coming_soon',
      },
      {
        id: 'prospectus',
        label: 'Folleto',
        status: 'coming_soon',
      },
    ],
    returnsByPeriod: buildReturnsByPeriod(input.allPrices),
    returnsByYear: buildReturnsByYear(input.allPrices),
    currencyNote: `* Calculada en ${fund.currency}`,
    methodNote: 'Rentabilidades netas de comisiones del fondo.',
    ratiosByHorizon: {
      '12m': buildRatioRows(fund.metrics.volatility, fund.metrics.drawdown),
      '3y': buildRatioRows(fund.metrics.volatility, fund.metrics.drawdown),
      '5y': buildRatioRows(fund.metrics.volatility, fund.metrics.drawdown),
    },
    exposureByTab: {
      sectorial: mapAllocationsToSlices(input.sectors.sectors),
      regional: mapAllocationsToSlices(
        input.allocationsByCategory.regional ?? [],
      ),
      assetAllocation: mapAllocationsToSlices(
        input.allocationsByCategory.assetAllocation ?? [],
      ),
      capitalization: mapAllocationsToSlices(
        input.allocationsByCategory.capitalization ?? [],
      ),
      portfolio: mapHoldingsToPortfolioSlices(input.holdings.holdings),
    },
    distributors: [],
  };

  return fundDetailResponseSchema.parse({
    fund: {
      id: fund.id,
      isin: fund.isin,
      symbol: branding.symbol,
      issuer: branding.issuer,
      logoUrl: branding.logoUrl,
      name: fund.name,
      vehicleType: fund.vehicle,
      categoryLabel: buildCategoryLabel(fund),
      themeLabel,
      badge,
      idealForBeginners: resolveIdealForBeginners(fund),
      efficiencyScore: inversoraScore,
      terPercent,
      riskLevel,
      diversification: resolveDiversificationLevel(input.holdings.holdings),
      quarterTag: quarter.quarterTag,
      periodStart: quarter.periodStart,
      periodEnd: quarter.periodEnd,
      benefitSummary: buildBenefitSummary(fund),
      featuredReason: '',
      isFeatured: false,
    },
    inversoraScore,
    rank: input.rank,
    scoredBreakdown,
    scoringStatus,
    market: buildMarketSnapshot({
      charts: input.charts,
      ytdPrices: input.ytdPrices,
      maxPrices: input.maxPrices,
      countries: input.countries,
      volatility: fund.metrics.volatility,
    }),
    profile,
  });
}

/**
 * Filters price rows to the year-to-date window.
 *
 * @param prices - Full price history ordered by date ascending.
 * @param latestDate - Latest available price date.
 */
export function filterPricesForYtd(
  prices: readonly FundPrice[],
  latestDate: string | null,
): FundPrice[] {
  if (latestDate === null || prices.length === 0) {
    return [];
  }

  const yearStart = `${latestDate.slice(0, 4)}-01-01`;
  return prices.filter((price) => price.date >= yearStart);
}

/**
 * Resolves the date range used to fetch the max performance series.
 *
 * @param latestDate - Latest available price date.
 */
export function resolveMaxChartDateRange(latestDate: string | null): {
  from: string;
  to: string | null;
} {
  if (latestDate === null) {
    const today = formatFundPriceDate(new Date());
    return { from: today, to: null };
  }

  return { from: '1970-01-01', to: latestDate };
}

/**
 * Re-exports chart date helpers for the aggregator service.
 */
export { resolveChartDateRange };
