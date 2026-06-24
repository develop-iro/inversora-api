/**
 * RN-04 scoring weights — canonical MVP algorithm (ADR-002).
 *
 * @see docs/scoring-rn-04.md
 * @see docs/architecture/adr-002-scoring-mvp-version.md
 */
export const SCORE_WEIGHTS = {
  ter: 0.4,
  tracking: 0.4,
  aum: 0.1,
  age: 0.1,
} as const;

/** Maximum points awarded per RN-04 scoring factor. */
export const SCORE_MAX_POINTS = {
  ter: SCORE_WEIGHTS.ter * 100,
  tracking: SCORE_WEIGHTS.tracking * 100,
  aum: SCORE_WEIGHTS.aum * 100,
  age: SCORE_WEIGHTS.age * 100,
} as const;

/** Public algorithm version returned by scoring endpoints. */
export const SCORING_ALGORITHM_VERSION = 'rn-04';
