/**
 * Configurable weights for the legacy experimental scoring algorithm (`mvp-1`).
 *
 * Retained for unit tests and reference only — not used by {@link ScoringService}.
 *
 * @see docs/scoring-algorithm.md — legacy implementation
 */
export const LEGACY_SCORE_WEIGHTS = {
  riskAdjustedReturn: 0.4,
  risk: 0.2,
  cost: 0.15,
  diversification: 0.1,
  fundSize: 0.1,
  age: 0.05,
} as const;

/** Maximum points awarded per legacy scoring factor. */
export const LEGACY_SCORE_MAX_POINTS = {
  riskAdjustedReturn: LEGACY_SCORE_WEIGHTS.riskAdjustedReturn * 100,
  risk: LEGACY_SCORE_WEIGHTS.risk * 100,
  cost: LEGACY_SCORE_WEIGHTS.cost * 100,
  diversification: LEGACY_SCORE_WEIGHTS.diversification * 100,
  fundSize: LEGACY_SCORE_WEIGHTS.fundSize * 100,
  age: LEGACY_SCORE_WEIGHTS.age * 100,
} as const;

/** Legacy experimental algorithm version. */
export const LEGACY_SCORING_ALGORITHM_VERSION = 'mvp-1';
