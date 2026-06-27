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
});
