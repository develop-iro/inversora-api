/**
 * Configurable weights for the Invesora Score MVP algorithm.
 *
 * @see docs/scoring-algorithm.md
 */
export const SCORE_WEIGHTS = {
  riskAdjustedReturn: 0.4,
  risk: 0.2,
  cost: 0.15,
  diversification: 0.1,
  fundSize: 0.1,
  age: 0.05,
} as const;

/** Maximum points awarded per scoring factor. */
export const SCORE_MAX_POINTS = {
  riskAdjustedReturn: SCORE_WEIGHTS.riskAdjustedReturn * 100,
  risk: SCORE_WEIGHTS.risk * 100,
  cost: SCORE_WEIGHTS.cost * 100,
  diversification: SCORE_WEIGHTS.diversification * 100,
  fundSize: SCORE_WEIGHTS.fundSize * 100,
  age: SCORE_WEIGHTS.age * 100,
} as const;

/** Algorithm version identifier for auditability and future profile-based variants. */
export const SCORING_ALGORITHM_VERSION = 'mvp-1';
