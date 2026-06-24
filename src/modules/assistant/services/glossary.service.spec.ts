import { GlossaryService } from './glossary.service';

describe('GlossaryService', () => {
  const service = new GlossaryService();

  it('matches TER terminology', () => {
    const match = service.match('¿Qué es el TER?');

    expect(match?.entry.term).toBe('TER');
  });

  it('matches benchmark keywords', () => {
    const match = service.match('Explícame el benchmark del fondo');

    expect(match?.entry.term).toBe('Benchmark');
  });

  it('returns null for unrelated queries', () => {
    expect(service.match('MSCI World IE00B4L5Y983')).toBeNull();
  });
});
