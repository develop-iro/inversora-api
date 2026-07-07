import { z } from 'zod';

/** Canonical investment theme codes used for catalog grouping and filters. */
export const investmentThemeSchema = z.enum([
  'global-equity',
  'us-equity',
  'europe-equity',
  'emerging-equity',
  'fixed-income',
  'multi-asset',
  'technology',
  'esg',
  'sector-other',
  'unclassified',
]);

/** Inferred type for investment theme codes. */
export type InvestmentTheme = z.infer<typeof investmentThemeSchema>;

/** Spanish display labels for each investment theme (MVP locale). */
export const INVESTMENT_THEME_LABELS: Readonly<
  Record<InvestmentTheme, string>
> = {
  'global-equity': 'Renta variable global',
  'us-equity': 'Renta variable USA',
  'europe-equity': 'Renta variable Europa',
  'emerging-equity': 'Mercados emergentes',
  'fixed-income': 'Renta fija',
  'multi-asset': 'Multiactivo',
  technology: 'Tecnología',
  esg: 'ESG y sostenibilidad',
  'sector-other': 'Sectorial',
  unclassified: 'Sin clasificar',
};

/**
 * Resolves the Spanish theme label for a canonical investment theme code.
 *
 * @param theme - Canonical investment theme.
 */
export function resolveInvestmentThemeLabel(theme: InvestmentTheme): string {
  return INVESTMENT_THEME_LABELS[theme];
}
