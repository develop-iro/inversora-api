import type { FeaturedQuarterSelection } from '../entities/featured-funds.schema';
import { compareQuarterKeys } from '../entities/quarter-metadata.utils';

/**
 * Manual quarterly featured fund selections (MVP).
 *
 * Product curates ISINs and editorial copy per quarter. Runtime hydrates each
 * entry from PostgreSQL (name, score, TER, risk) and skips funds that are not
 * synced yet. Future phases may move this to CMS or admin tooling.
 *
 * ISINs must match funds already synced in staging/production. UCITS entries
 * remain aspirational until non-US EOD is available on the active FMP plan.
 */
export const FEATURED_FUNDS_SELECTIONS: readonly FeaturedQuarterSelection[] = [
  {
    quarterKey: '2026-Q1',
    entries: [
      {
        isin: 'IE00B4L5Y983',
        themeLabel: 'Multisector global',
        badge: 'Ideal para empezar',
        benefitSummary:
          'UCITS que replica el MSCI World con amplia diversificación en mercados desarrollados.',
        featuredReason: 'Bajo coste + alta diversificación',
        marketTag: 'global',
      },
      {
        isin: 'IE00B5BMR087',
        themeLabel: 'Gran capitalización USA',
        badge: 'Núcleo de cartera',
        benefitSummary:
          'UCITS sobre el S&P 500, habitual en brokers europeos para exposición USA.',
        featuredReason: 'Comisión mínima + referencia global',
        marketTag: 'usa',
      },
      {
        isin: 'US9220428588',
        themeLabel: 'Mercados emergentes',
        badge: 'Diversificación geográfica',
        benefitSummary:
          'Exposición a economías emergentes para complementar una base global o USA.',
        featuredReason: 'Amplitud geográfica + coste contenido',
        marketTag: 'global',
      },
      {
        isin: 'US9229087690',
        themeLabel: 'Mercado total USA',
        badge: 'Amplia cobertura',
        benefitSummary:
          'Incluye desde grandes empresas hasta small caps del mercado estadounidense.',
        featuredReason: 'Máxima diversificación USA en un solo ETF',
        marketTag: 'usa',
      },
    ],
  },
  {
    quarterKey: '2026-Q2',
    entries: [
      {
        isin: 'US78462F1030',
        themeLabel: 'Referencia S&P 500',
        badge: 'Núcleo USA',
        benefitSummary:
          'Replica el índice S&P 500 con alta liquidez y costes competitivos.',
        featuredReason: 'Referencia global + datos verificados en catálogo',
        marketTag: 'usa',
      },
      {
        isin: 'US4642872000',
        themeLabel: 'Gran capitalización USA',
        badge: 'Comisión mínima',
        benefitSummary:
          'ETF sobre el S&P 500 con TER muy bajo, habitual en carteras de largo plazo.',
        featuredReason: 'Comisión mínima + referencia global',
        marketTag: 'usa',
      },
      {
        isin: 'US9229087690',
        themeLabel: 'Mercado total USA',
        badge: 'Amplia cobertura',
        benefitSummary:
          'Incluye desde grandes empresas hasta small caps del mercado estadounidense.',
        featuredReason: 'Máxima diversificación USA en un solo ETF',
        marketTag: 'usa',
      },
    ],
  },
  {
    quarterKey: '2026-Q3',
    entries: [
      {
        isin: 'US4642872000',
        themeLabel: 'Gran capitalización USA',
        badge: 'Comisión mínima',
        benefitSummary:
          'ETF sobre el S&P 500 con TER muy bajo, habitual en carteras de largo plazo.',
        featuredReason: 'Comisión mínima + referencia global',
        marketTag: 'usa',
      },
      {
        isin: 'US9229083632',
        themeLabel: 'Referencia S&P 500',
        badge: 'Núcleo USA',
        benefitSummary:
          'Replica el índice S&P 500 con alta liquidez y costes muy competitivos.',
        featuredReason: 'Referencia global + datos verificados en catálogo',
        marketTag: 'usa',
      },
    ],
  },
];

/**
 * Returns the curated selection for a quarter key, if configured.
 *
 * @param quarterKey - Canonical quarter key (`YYYY-QN`).
 */
export function findFeaturedSelectionByQuarterKey(
  quarterKey: string,
): FeaturedQuarterSelection | undefined {
  return FEATURED_FUNDS_SELECTIONS.find(
    (selection) => selection.quarterKey === quarterKey,
  );
}

/**
 * Returns the most recent configured featured selection by quarter key.
 */
export function findLatestFeaturedSelection():
  | FeaturedQuarterSelection
  | undefined {
  if (FEATURED_FUNDS_SELECTIONS.length === 0) {
    return undefined;
  }

  return [...FEATURED_FUNDS_SELECTIONS].sort((left, right) =>
    compareQuarterKeys(right.quarterKey, left.quarterKey),
  )[0];
}

/**
 * Resolves a featured selection for the requested quarter.
 *
 * When `allowLatestFallback` is true and the quarter has no curation yet,
 * returns the latest configured selection so the home carousel can show the
 * most recent editorial pick until the new quarter is published.
 *
 * @param quarterKey - Canonical quarter key (`YYYY-QN`).
 * @param options - Fallback behavior for default quarter requests.
 */
export function resolveFeaturedSelectionForQuarter(
  quarterKey: string,
  options?: { readonly allowLatestFallback?: boolean },
): FeaturedQuarterSelection | undefined {
  const directSelection = findFeaturedSelectionByQuarterKey(quarterKey);

  if (directSelection !== undefined) {
    return directSelection;
  }

  if (options?.allowLatestFallback !== true) {
    return undefined;
  }

  return findLatestFeaturedSelection();
}
