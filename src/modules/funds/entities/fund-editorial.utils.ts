import type { Fund } from './fund.schema';

/** Risk label used by BFF mappers when resolving beginner suitability. */
export type AppRiskLevel = 'low' | 'medium' | 'high';

/**
 * Maps a numeric backend risk level to the app risk label.
 *
 * @param riskLevel - Persisted risk level between 1 and 7.
 */
export function mapRiskLevelToApp(riskLevel: number | null): AppRiskLevel {
  if (riskLevel === null) {
    return 'medium';
  }

  if (riskLevel <= 2) {
    return 'low';
  }

  if (riskLevel <= 5) {
    return 'medium';
  }

  return 'high';
}

/**
 * Returns whether the fund has persisted editorial copy beyond defaults.
 *
 * @param fund - Persisted fund entity.
 */
export function hasPersistedEditorialContent(fund: Fund): boolean {
  return (
    fund.editorial.badge.trim() !== '' ||
    fund.editorial.themeLabel.trim() !== ''
  );
}

/**
 * Computes beginner suitability from score, risk, and TER product rules.
 *
 * @param fund - Persisted fund entity.
 */
export function computeIdealForBeginnersFromMetrics(fund: Fund): boolean {
  const terPercent = fund.metrics.ter ?? 0;
  const riskLevel = mapRiskLevelToApp(fund.riskLevel);
  const score = Math.round(fund.score ?? 0);

  return score >= 70 && riskLevel !== 'high' && terPercent <= 0.5;
}

/**
 * Resolves the `idealForBeginners` flag for API responses.
 *
 * Uses the persisted editorial boolean when product copy exists; otherwise
 * falls back to deterministic metric rules until editorial is curated.
 *
 * @param fund - Persisted fund entity.
 */
export function resolveIdealForBeginners(fund: Fund): boolean {
  if (hasPersistedEditorialContent(fund)) {
    return fund.editorial.idealForBeginners;
  }

  return computeIdealForBeginnersFromMetrics(fund);
}

/**
 * Resolves badge and theme labels for API responses.
 *
 * @param fund - Persisted fund entity.
 */
export function resolveEditorialLabels(fund: Fund): {
  badge: string;
  themeLabel: string;
} {
  return {
    badge: fund.editorial.badge,
    themeLabel: fund.editorial.themeLabel,
  };
}
