/**
 * Configurable weights for the legacy experimental scoring algorithm (`mvp-1`).
 *
 * Do not use for public rankings or production — target MVP is RN-04 (`rn-04`).
 *
 * @see docs/scoring-algorithm.md — legacy implementation
 * @see docs/scoring-rn-04.md — canonical MVP specification
 * @see docs/architecture/adr-002-scoring-mvp-version.md
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

/**
 * Target algorithm version for public MVP rankings (RN-04).
 * Implementation pending — see docs/scoring-rn-04.md.
 */
export const SCORING_TARGET_ALGORITHM_VERSION = 'rn-04';

/** Legacy experimental version currently returned by the API until rn-04 is implemented. */
export const SCORING_ALGORITHM_VERSION = 'mvp-1';
