import {
  CatalogVisibility as PrismaCatalogVisibility,
  FundCategory as PrismaFundCategory,
  FundProvider as PrismaFundProvider,
  FundVehicleType as PrismaFundVehicleType,
  type Fund as PrismaFund,
  type Prisma,
} from '@prisma/client';
import type { Decimal } from '@prisma/client/runtime/library';
import type { ProviderFundProfile } from '../../providers/financial-modeling-prep/financial-modeling-prep.domain.schemas';
import { fundSchema, upsertFundInputSchema } from './fund.schema';
import type {
  Fund,
  FundCategory,
  FundMetrics,
  FundProvider,
  FundVehicleType,
  UpsertFundInput,
} from './fund.schema';
import type { UpdateFundEditorialInput } from './fund-editorial.schema';
import type { CatalogVisibility } from './catalog-visibility.schema';
import {
  DEFAULT_FUND_EDITORIAL,
  type FundEditorial,
} from './fund-editorial.schema';

const ISO_4217_CURRENCY_PATTERN = /^[A-Z]{3}$/;
const ISO_6166_ISIN_PATTERN = /^[A-Z]{2}[A-Z0-9]{9}[0-9]$/;

/**
 * Maps a Prisma catalog visibility enum to the domain value.
 *
 * @param visibility - Prisma catalog visibility enum.
 */
export function mapPrismaCatalogVisibility(
  visibility: PrismaCatalogVisibility,
): CatalogVisibility {
  switch (visibility) {
    case PrismaCatalogVisibility.VISIBLE:
      return 'visible';
    case PrismaCatalogVisibility.QUARANTINED:
      return 'quarantined';
    case PrismaCatalogVisibility.BLOCKED:
      return 'blocked';
    default: {
      const exhaustiveCheck: never = visibility;
      return exhaustiveCheck;
    }
  }
}

/**
 * Maps a domain catalog visibility value to the Prisma enum.
 *
 * @param visibility - Domain catalog visibility value.
 */
export function mapDomainCatalogVisibilityToPrisma(
  visibility: CatalogVisibility,
): PrismaCatalogVisibility {
  switch (visibility) {
    case 'visible':
      return PrismaCatalogVisibility.VISIBLE;
    case 'quarantined':
      return PrismaCatalogVisibility.QUARANTINED;
    case 'blocked':
      return PrismaCatalogVisibility.BLOCKED;
    default: {
      const exhaustiveCheck: never = visibility;
      return exhaustiveCheck;
    }
  }
}

/**
 * Maps a Prisma fund provider enum to the domain provider value.
 *
 * @param provider - Prisma fund provider enum.
 * @returns Domain provider value.
 */
export function mapPrismaFundProvider(
  provider: PrismaFundProvider,
): FundProvider {
  switch (provider) {
    case PrismaFundProvider.FINANCIAL_MODELING_PREP:
      return 'financial-modeling-prep';
    default: {
      const exhaustiveCheck: never = provider;
      return exhaustiveCheck;
    }
  }
}

/**
 * Maps a Prisma fund category enum to the domain category value.
 *
 * @param category - Prisma fund category enum.
 * @returns Domain category value.
 */
export function mapPrismaFundCategory(
  category: PrismaFundCategory,
): FundCategory {
  switch (category) {
    case PrismaFundCategory.INDEX:
      return 'index';
    default: {
      const exhaustiveCheck: never = category;
      return exhaustiveCheck;
    }
  }
}

/**
 * Maps a Prisma fund vehicle enum to the domain vehicle value.
 *
 * @param vehicle - Prisma fund vehicle enum.
 */
export function mapPrismaFundVehicle(
  vehicle: PrismaFundVehicleType,
): FundVehicleType {
  switch (vehicle) {
    case PrismaFundVehicleType.ETF:
      return 'etf';
    case PrismaFundVehicleType.MUTUAL_FUND:
      return 'mutual-fund';
    default: {
      const exhaustiveCheck: never = vehicle;
      return exhaustiveCheck;
    }
  }
}

/**
 * Maps a nullable Prisma decimal to a domain number.
 *
 * @param value - Nullable Prisma decimal column.
 * @returns Domain number or `null`.
 */
function mapNullableDecimal(value: Decimal | null): number | null {
  return value === null ? null : value.toNumber();
}

/**
 * Maps persisted metric columns to the domain metrics object.
 *
 * @param record - Persisted Prisma fund row.
 * @returns Validated calculated fund metrics.
 */
export function mapPrismaFundMetrics(record: PrismaFund): FundMetrics {
  return {
    volatility: mapNullableDecimal(record.volatility),
    drawdown: mapNullableDecimal(record.drawdown),
    ter: mapNullableDecimal(record.ter),
    aum: mapNullableDecimal(record.aum),
    per: mapNullableDecimal(record.per),
    dividendYield: mapNullableDecimal(record.dividendYield),
    trackingError: mapNullableDecimal(record.trackingError),
  };
}

/**
 * Maps persisted editorial columns to the domain editorial object.
 *
 * @param record - Persisted Prisma fund row.
 */
export function mapPrismaFundEditorial(record: PrismaFund): FundEditorial {
  return {
    badge: record.badge,
    themeLabel: record.themeLabel,
    idealForBeginners: record.idealForBeginners,
  };
}

/**
 * Maps a Prisma fund record to the Invesora domain entity.
 *
 * @param record - Persisted Prisma fund row.
 * @returns Validated Invesora fund entity.
 */
export function mapPrismaFundToFund(record: PrismaFund): Fund {
  return fundSchema.parse({
    id: record.id,
    symbol: record.symbol,
    isin: record.isin,
    name: record.name,
    provider: mapPrismaFundProvider(record.provider),
    category: mapPrismaFundCategory(record.category),
    vehicle: mapPrismaFundVehicle(record.vehicle),
    currency: record.currency,
    benchmark: record.benchmark,
    metrics: mapPrismaFundMetrics(record),
    riskLevel: record.riskLevel,
    score: mapNullableDecimal(record.score),
    editorial: mapPrismaFundEditorial(record),
    catalogVisibility: mapPrismaCatalogVisibility(record.catalogVisibility),
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
  });
}

/**
 * Maps a domain fund provider to the Prisma enum value.
 *
 * @param provider - Domain provider value.
 * @returns Prisma fund provider enum.
 */
export function mapDomainFundProviderToPrisma(
  provider: FundProvider,
): PrismaFundProvider {
  switch (provider) {
    case 'financial-modeling-prep':
      return PrismaFundProvider.FINANCIAL_MODELING_PREP;
    default: {
      const exhaustiveCheck: never = provider;
      return exhaustiveCheck;
    }
  }
}

/**
 * Maps a domain fund category to the Prisma enum value.
 *
 * @param category - Domain category value.
 * @returns Prisma fund category enum.
 */
export function mapDomainFundCategoryToPrisma(
  category: FundCategory,
): PrismaFundCategory {
  switch (category) {
    case 'index':
      return PrismaFundCategory.INDEX;
    default: {
      const exhaustiveCheck: never = category;
      return exhaustiveCheck;
    }
  }
}

/**
 * Maps a domain fund vehicle to the Prisma enum value.
 *
 * @param vehicle - Domain vehicle value.
 */
export function mapDomainFundVehicleToPrisma(
  vehicle: FundVehicleType,
): PrismaFundVehicleType {
  switch (vehicle) {
    case 'etf':
      return PrismaFundVehicleType.ETF;
    case 'mutual-fund':
      return PrismaFundVehicleType.MUTUAL_FUND;
    default: {
      const exhaustiveCheck: never = vehicle;
      return exhaustiveCheck;
    }
  }
}

/**
 * Resolves the ISO 4217 currency code for a normalized provider fund profile.
 *
 * @param profile - Normalized provider fund profile.
 * @returns Uppercase 3-letter currency code.
 */
export function resolveFundCurrencyFromProfile(
  profile: ProviderFundProfile,
): string {
  const rawCurrency = profile.currency ?? profile.navCurrency ?? 'USD';
  const normalizedCurrency = rawCurrency.trim().toUpperCase();

  if (ISO_4217_CURRENCY_PATTERN.test(normalizedCurrency)) {
    return normalizedCurrency;
  }

  return 'USD';
}

/**
 * Normalizes an optional ISIN value for persistence.
 *
 * @param isin - Optional provider ISIN value.
 * @returns Valid uppercase ISIN, `null` when absent/invalid, or `undefined` when omitted.
 */
export function normalizeOptionalFundIsin(
  isin?: string,
): string | null | undefined {
  if (isin === undefined) {
    return undefined;
  }

  const normalizedIsin = isin.trim().toUpperCase();

  if (normalizedIsin === '') {
    return null;
  }

  return ISO_6166_ISIN_PATTERN.test(normalizedIsin) ? normalizedIsin : null;
}

/**
 * Maps a normalized provider profile to a fund upsert input.
 *
 * @param profile - Normalized provider fund profile from FMP.
 * @returns Validated upsert input for PostgreSQL persistence.
 */
export function mapProviderFundProfileToUpsertFundInput(
  profile: ProviderFundProfile,
): UpsertFundInput {
  return upsertFundInputSchema.parse({
    symbol: profile.symbol.trim().toUpperCase(),
    isin: normalizeOptionalFundIsin(profile.isin),
    name: profile.name,
    provider: 'financial-modeling-prep',
    category: 'index',
    vehicle: profile.vehicle,
    currency: resolveFundCurrencyFromProfile(profile),
    benchmark: profile.benchmark ?? null,
    metrics: {
      ter: profile.expenseRatio ?? null,
      aum: profile.assetsUnderManagement ?? null,
      volatility: null,
      drawdown: null,
      per: null,
      dividendYield: null,
      trackingError: null,
    },
  });
}

/**
 * Maps partial domain metrics to Prisma fund metric columns.
 *
 * @param metrics - Partial domain metrics object.
 * @returns Prisma metric column values.
 */
export function mapFundMetricsToPrismaFields(
  metrics: Partial<FundMetrics> = {},
): Pick<
  Prisma.FundUncheckedCreateInput,
  | 'volatility'
  | 'drawdown'
  | 'ter'
  | 'aum'
  | 'per'
  | 'dividendYield'
  | 'trackingError'
> {
  return {
    volatility: metrics.volatility ?? null,
    drawdown: metrics.drawdown ?? null,
    ter: metrics.ter ?? null,
    aum: metrics.aum ?? null,
    per: metrics.per ?? null,
    dividendYield: metrics.dividendYield ?? null,
    trackingError: metrics.trackingError ?? null,
  };
}

/**
 * Maps a fund upsert input to Prisma create payload fields.
 *
 * @param input - Validated upsert input.
 * @returns Prisma create payload.
 */
export function mapUpsertFundInputToPrismaCreateData(
  input: UpsertFundInput,
): Prisma.FundUncheckedCreateInput {
  return {
    symbol: input.symbol.trim().toUpperCase(),
    isin: input.isin ?? null,
    name: input.name,
    provider: mapDomainFundProviderToPrisma(input.provider),
    category: mapDomainFundCategoryToPrisma(input.category),
    vehicle: mapDomainFundVehicleToPrisma(input.vehicle),
    currency: input.currency,
    benchmark: input.benchmark ?? null,
    ...mapFundMetricsToPrismaFields(input.metrics ?? {}),
    riskLevel: input.riskLevel ?? null,
    score: input.score ?? null,
    badge: input.editorial?.badge ?? DEFAULT_FUND_EDITORIAL.badge,
    themeLabel:
      input.editorial?.themeLabel ?? DEFAULT_FUND_EDITORIAL.themeLabel,
    idealForBeginners:
      input.editorial?.idealForBeginners ??
      DEFAULT_FUND_EDITORIAL.idealForBeginners,
    catalogVisibility:
      input.catalogVisibility === undefined
        ? PrismaCatalogVisibility.VISIBLE
        : mapDomainCatalogVisibilityToPrisma(input.catalogVisibility),
  };
}

/**
 * Maps a fund upsert input to Prisma update payload fields.
 *
 * @param input - Validated upsert input.
 * @returns Prisma update payload.
 */
export function mapUpsertFundInputToPrismaUpdateData(
  input: UpsertFundInput,
): Prisma.FundUncheckedUpdateInput {
  return {
    isin: input.isin ?? null,
    name: input.name,
    category: mapDomainFundCategoryToPrisma(input.category),
    vehicle: mapDomainFundVehicleToPrisma(input.vehicle),
    currency: input.currency,
    benchmark: input.benchmark ?? null,
    ...mapFundMetricsToPrismaFields(input.metrics ?? {}),
    riskLevel: input.riskLevel ?? null,
    score: input.score ?? null,
  };
}

/**
 * Maps a partial editorial update to Prisma update columns.
 *
 * @param input - Partial editorial fields from admin API.
 */
export function mapUpdateFundEditorialInputToPrismaData(
  input: UpdateFundEditorialInput,
): Pick<
  Prisma.FundUncheckedUpdateInput,
  'badge' | 'themeLabel' | 'idealForBeginners'
> {
  return {
    ...(input.badge !== undefined ? { badge: input.badge } : {}),
    ...(input.themeLabel !== undefined ? { themeLabel: input.themeLabel } : {}),
    ...(input.idealForBeginners !== undefined
      ? { idealForBeginners: input.idealForBeginners }
      : {}),
  };
}
