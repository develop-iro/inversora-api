import type {
  InvesoraScore,
  ScoreFactorBreakdown,
} from './invesora-score.schema';

const PAST_PERFORMANCE_WARNING =
  'La rentabilidad pasada no garantiza resultados futuros.';

const INCOMPLETE_DATA_WARNING =
  'Algunos datos del fondo están incompletos; el score usa una estimación conservadora.';

const FACTOR_LABELS = {
  ter: 'Comisión (TER)',
  tracking: 'Tracking error',
  aum: 'Patrimonio (AUM)',
  age: 'Antigüedad del fondo',
} as const;

function isStrongFactor(factor: ScoreFactorBreakdown): boolean {
  return factor.points / factor.maxPoints >= 0.75;
}

function isWeakFactor(factor: ScoreFactorBreakdown): boolean {
  return factor.points / factor.maxPoints < 0.45;
}

/**
 * Builds a short Spanish summary highlighting the strongest scoring factors.
 */
export function buildScoreSummary(
  breakdown: InvesoraScore['breakdown'],
): string {
  const factors = Object.entries(breakdown).map(([key, factor]) => ({
    key,
    factor: {
      ...factor,
      label: FACTOR_LABELS[key as keyof typeof FACTOR_LABELS],
    },
  }));

  const strengths = factors
    .filter(({ factor }) => isStrongFactor(factor))
    .map(({ factor }) => factor.label.toLowerCase());

  const weaknesses = factors
    .filter(({ factor }) => isWeakFactor(factor))
    .map(({ factor }) => factor.label.toLowerCase());

  if (strengths.length === 0 && weaknesses.length === 0) {
    return 'Este fondo presenta un perfil equilibrado dentro de su categoría.';
  }

  if (strengths.length > 0 && weaknesses.length === 0) {
    return `Este fondo destaca por su ${strengths.slice(0, 3).join(', ')}.`;
  }

  if (strengths.length === 0 && weaknesses.length > 0) {
    return `Este fondo podría mejorar en ${weaknesses.slice(0, 2).join(' y ')}.`;
  }

  return `Este fondo destaca por su ${strengths.slice(0, 2).join(' y ')}, aunque podría mejorar en ${weaknesses[0]}.`;
}

/**
 * Builds user-facing warnings for the score response.
 */
export function buildScoreWarnings(
  breakdown: InvesoraScore['breakdown'],
): string[] {
  const warnings = [PAST_PERFORMANCE_WARNING];
  const hasIncompleteFactor = Object.values(breakdown).some(
    (factor) => factor.incomplete === true,
  );

  if (hasIncompleteFactor) {
    warnings.push(INCOMPLETE_DATA_WARNING);
  }

  return warnings;
}
