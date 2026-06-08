import type { InvesoraScore } from './invesora-score.schema';
import { buildScoreSummary, buildScoreWarnings } from './score-summary.builder';

function buildBreakdown(
  overrides: Partial<InvesoraScore['breakdown']> = {},
): InvesoraScore['breakdown'] {
  return {
    riskAdjustedReturn: {
      points: 24,
      maxPoints: 40,
      label: 'Rentabilidad ajustada al riesgo',
      incomplete: false,
    },
    risk: {
      points: 12,
      maxPoints: 20,
      label: 'Riesgo',
      incomplete: false,
    },
    cost: {
      points: 9,
      maxPoints: 15,
      label: 'Comisión anual',
      incomplete: false,
    },
    diversification: {
      points: 6,
      maxPoints: 10,
      label: 'Diversificación',
      incomplete: false,
    },
    fundSize: {
      points: 6,
      maxPoints: 10,
      label: 'Tamaño del fondo',
      incomplete: false,
    },
    age: {
      points: 3,
      maxPoints: 5,
      label: 'Antigüedad',
      incomplete: false,
    },
    ...overrides,
  };
}

describe('score-summary.builder', () => {
  it('should describe a balanced profile when no factor stands out', () => {
    expect(buildScoreSummary(buildBreakdown())).toBe(
      'Este fondo presenta un perfil equilibrado dentro de su categoría.',
    );
  });

  it('should highlight strengths when factors score well', () => {
    expect(
      buildScoreSummary(
        buildBreakdown({
          riskAdjustedReturn: {
            points: 35,
            maxPoints: 40,
            label: 'Rentabilidad ajustada al riesgo',
            incomplete: false,
          },
          cost: {
            points: 14,
            maxPoints: 15,
            label: 'Comisión anual',
            incomplete: false,
          },
        }),
      ),
    ).toContain('destaca por su');
  });

  it('should mention weaknesses when factors score poorly', () => {
    expect(
      buildScoreSummary(
        buildBreakdown({
          diversification: {
            points: 2,
            maxPoints: 10,
            label: 'Diversificación',
            incomplete: false,
          },
        }),
      ),
    ).toContain('podría mejorar');
  });

  it('should combine strengths and weaknesses in the summary', () => {
    expect(
      buildScoreSummary(
        buildBreakdown({
          cost: {
            points: 14,
            maxPoints: 15,
            label: 'Comisión anual',
            incomplete: false,
          },
          diversification: {
            points: 2,
            maxPoints: 10,
            label: 'Diversificación',
            incomplete: false,
          },
        }),
      ),
    ).toContain('aunque podría mejorar');
  });

  it('should add an incomplete-data warning when needed', () => {
    expect(
      buildScoreWarnings(
        buildBreakdown({
          cost: {
            points: 6,
            maxPoints: 15,
            label: 'Comisión anual',
            incomplete: true,
          },
        }),
      ),
    ).toContain(
      'Algunos datos del fondo están incompletos; el score usa una estimación conservadora.',
    );
  });
});
