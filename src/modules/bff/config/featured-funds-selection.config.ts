import type { FeaturedQuarterSelection } from '../entities/featured-funds.schema';

/**
 * Manual quarterly featured fund selections (MVP).
 *
 * Product curates ISINs and editorial copy per quarter. Runtime hydrates each
 * entry from PostgreSQL (name, score, TER, risk) and skips funds that are not
 * synced yet. Future phases may move this to CMS or admin tooling.
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
          'Invierte en más de 1.500 empresas globales en una sola posición.',
        featuredReason: 'Bajo coste + alta diversificación',
        marketTag: 'global',
      },
      {
        isin: 'IE00B5BMR087',
        themeLabel: 'Tecnología y mega caps',
        badge: 'Núcleo de cartera',
        benefitSummary:
          'Ideal para diversificación a largo plazo con sesgo a grandes empresas de EE. UU.',
        featuredReason: 'Comisión mínima + referencia global',
        marketTag: 'usa',
      },
      {
        isin: 'LU1781541179',
        themeLabel: 'Renovables y ESG',
        badge: 'Filtro calidad ESG',
        benefitSummary:
          'Exposición a empresas europeas consolidadas con criterios de sostenibilidad.',
        featuredReason: 'Calidad empresarial + enfoque responsable',
        marketTag: 'europa',
      },
      {
        isin: 'IE00BYVJRP78',
        themeLabel: 'Multiactivo equilibrado',
        badge: 'Volatilidad contenida',
        benefitSummary:
          'Combina renta fija y variable para suavizar oscilaciones del mercado.',
        featuredReason: 'Estabilidad relativa + diversificación multiactivo',
        marketTag: 'global',
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
        isin: 'IE00B4L5Y983',
        themeLabel: 'Multisector global',
        badge: 'Ideal para empezar',
        benefitSummary:
          'Invierte en más de 1.500 empresas globales en una sola posición.',
        featuredReason: 'Bajo coste + alta diversificación',
        marketTag: 'global',
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
