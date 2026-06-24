import type { InvesoraScore } from './invesora-score.schema';
import { buildScoreSummary, buildScoreWarnings } from './score-summary.builder';

function buildBreakdown(
  overrides: Partial<InvesoraScore['breakdown']> = {},
): InvesoraScore['breakdown'] {
  return {
    ter: {
      points: 24,
      maxPoints: 40,
      label: 'Comisión (TER)',
      incomplete: false,
    },
    tracking: {
      points: 24,
      maxPoints: 40,
      label: 'Tracking error',
      incomplete: false,
    },
    aum: {
      points: 6,
      maxPoints: 10,
      label: 'Patrimonio (AUM)',
      incomplete: false,
    },
    age: {
      points: 6,
      maxPoints: 10,
      label: 'Antigüedad del fondo',
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
          ter: {
            points: 35,
            maxPoints: 40,
            label: 'Comisión (TER)',
            incomplete: false,
          },
          tracking: {
            points: 34,
            maxPoints: 40,
            label: 'Tracking error',
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
          tracking: {
            points: 8,
            maxPoints: 40,
            label: 'Tracking error',
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
          ter: {
            points: 35,
            maxPoints: 40,
            label: 'Comisión (TER)',
            incomplete: false,
          },
          aum: {
            points: 2,
            maxPoints: 10,
            label: 'Patrimonio (AUM)',
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
          ter: {
            points: 16,
            maxPoints: 40,
            label: 'Comisión (TER)',
            incomplete: true,
          },
        }),
      ),
    ).toContain(
      'Algunos datos del fondo están incompletos; el score usa una estimación conservadora.',
    );
  });
});
