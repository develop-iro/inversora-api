import { GlossaryService } from './glossary.service';

/**
 * Conceptual prompts beginners are likely to ask, including SORA chip
 * suggestions and product FAQ from problem-statement §5.2.
 */
const BEGINNER_GLOSSARY_PROMPTS: readonly {
  readonly question: string;
  readonly expectedTerm: string;
}[] = [
  { question: '¿Qué es un fondo indexado?', expectedTerm: 'Fondo indexado' },
  {
    question: '¿Cómo funciona el Inversora Score?',
    expectedTerm: 'Score Inversora',
  },
  { question: '¿Qué significa el TER?', expectedTerm: 'TER' },
  {
    question: '¿Cómo filtrar fondos por categoría?',
    expectedTerm: 'Categorías de fondos',
  },
  {
    question: '¿Qué diferencia hay entre categorías?',
    expectedTerm: 'Categorías de fondos',
  },
  { question: '¿Qué mirar al comparar TER?', expectedTerm: 'TER' },
  {
    question: '¿Qué criterios usa el ranking?',
    expectedTerm: 'Score Inversora',
  },
  {
    question: '¿El score garantiza rentabilidad?',
    expectedTerm: 'Score Inversora',
  },
  {
    question: 'Resume las diferencias principales',
    expectedTerm: 'Cómo comparar fondos',
  },
  {
    question: '¿Cuál tiene menor TER y qué implica?',
    expectedTerm: 'TER',
  },
  {
    question: 'Explica las diferencias educativas entre estos fondos',
    expectedTerm: 'Cómo comparar fondos',
  },
  { question: '¿Qué es la volatilidad?', expectedTerm: 'Volatilidad' },
  {
    question: '¿Qué es el interés compuesto?',
    expectedTerm: 'Interés compuesto',
  },
  { question: '¿Qué es diversificación?', expectedTerm: 'Diversificación' },
  { question: '¿Qué es un índice?', expectedTerm: 'Índice de mercado' },
  { question: '¿Qué es el ISIN?', expectedTerm: 'ISIN' },
  {
    question: '¿La rentabilidad pasada garantiza el futuro?',
    expectedTerm: 'Rentabilidad pasada',
  },
  {
    question: '¿Por qué importan las comisiones?',
    expectedTerm: 'Comisión anual',
  },
  {
    question: '¿Qué es la gestión pasiva?',
    expectedTerm: 'Fondo indexado',
  },
  {
    question: '¿Qué diferencia hay entre ETF y fondo indexado?',
    expectedTerm: 'ETF y fondo indexado',
  },
  {
    question: '¿Inversora me recomienda fondos?',
    expectedTerm: 'Límites de Inversora',
  },
  {
    question: '¿Puedo comprar fondos aquí?',
    expectedTerm: 'Límites de Inversora',
  },
  {
    question: '¿Qué es el horizonte temporal?',
    expectedTerm: 'Horizonte temporal',
  },
  { question: '¿Ahorrar o invertir?', expectedTerm: 'Ahorrar e invertir' },
  {
    question: '¿Qué es el perfil orientativo?',
    expectedTerm: 'Perfil orientativo',
  },
  { question: '¿Qué es el riesgo?', expectedTerm: 'Riesgo al invertir' },
  {
    question: '¿Qué significa el tracking error?',
    expectedTerm: 'Tracking error',
  },
  { question: 'Explícame el benchmark', expectedTerm: 'Benchmark' },
];

describe('GlossaryService', () => {
  const service = new GlossaryService();

  it('matches TER terminology', () => {
    const match = service.match('¿Qué es el TER?');

    expect(match?.entry.term).toBe('TER');
  });

  it('matches the home suggested prompt for fondo indexado', () => {
    const match = service.match('¿Qué es un fondo indexado?');

    expect(match?.entry.term).toBe('Fondo indexado');
    expect(match?.entry.explanation).toMatch(/replica un índice/i);
  });

  it('does not confuse TER with interés compuesto or criterios', () => {
    expect(service.match('¿Qué es el interés compuesto?')?.entry.term).toBe(
      'Interés compuesto',
    );
    expect(service.match('¿Qué criterios usa el ranking?')?.entry.term).toBe(
      'Score Inversora',
    );
  });

  it('matches benchmark keywords', () => {
    const match = service.match('Explícame el benchmark del fondo');

    expect(match?.entry.term).toBe('Benchmark');
  });

  it('returns null for unrelated queries', () => {
    expect(service.match('MSCI World IE00B4L5Y983')).toBeNull();
  });

  it('returns null for empty messages', () => {
    expect(service.match('   ')).toBeNull();
  });

  it('prefers the longest matching glossary keyword', () => {
    const match = service.match('¿Qué es la comision anual del fondo?');

    expect(match?.matchedKeyword).toBe('comision anual');
    expect(match?.entry.term).toBe('Comisión anual');
  });

  it('looks up glossary entries by term', () => {
    expect(service.lookup('ter')?.term).toBe('TER');
    expect(service.lookup('Benchmark')?.term).toBe('Benchmark');
  });

  it('looks up glossary entries by keyword', () => {
    expect(service.lookup('comision anual')?.term).toBe('Comisión anual');
  });

  it('returns null when lookup term is empty or unknown', () => {
    expect(service.lookup('   ')).toBeNull();
    expect(service.lookup('isin inventado')).toBeNull();
  });

  it('returns the entry when lookup matches the canonical term name', () => {
    const entry = service.lookup('Comisión anual');

    expect(entry?.term).toBe('Comisión anual');
  });

  it.each(BEGINNER_GLOSSARY_PROMPTS)(
    'answers beginner prompt "$question" with $expectedTerm',
    ({ question, expectedTerm }) => {
      const match = service.match(question);

      expect(match?.entry.term).toBe(expectedTerm);
      expect(match?.entry.explanation.length).toBeGreaterThan(40);
    },
  );
});
