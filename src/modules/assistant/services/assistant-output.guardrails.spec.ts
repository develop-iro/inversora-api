import {
  ASSISTANT_GUARDRAIL_FALLBACK_TEXT,
  AssistantOutputGuardrailsService,
} from './assistant-output.guardrails';

describe('AssistantOutputGuardrailsService', () => {
  const service = new AssistantOutputGuardrailsService();

  it('sanitizes valid educational text', () => {
    expect(service.sanitize('El TER mide la comision anual del fondo.')).toBe(
      'El TER mide la comision anual del fondo.',
    );
  });

  it('rejects Spanish recommendation language', () => {
    expect(() => service.sanitize('Deberias comprar este fondo ya.')).toThrow(
      /prohibited recommendation language/i,
    );
    expect(() => service.sanitize('Te recomiendo este fondo.')).toThrow(
      /prohibited recommendation language/i,
    );
    expect(() => service.sanitize('Es la mejor opcion para ti.')).toThrow(
      /prohibited recommendation language/i,
    );
  });

  it('rejects English recommendation language', () => {
    expect(() => service.sanitize('You should buy this fund now.')).toThrow(
      /prohibited recommendation language/i,
    );
    expect(() =>
      service.sanitize('I recommend investing in this ETF.'),
    ).toThrow(/prohibited recommendation language/i);
  });

  it('normalizes accents before checking recommendation language', () => {
    expect(() => service.sanitize('Es la mejor opción para ti.')).toThrow(
      /prohibited recommendation language/i,
    );
  });

  it('returns a safe fallback when sanitize fails', () => {
    expect(service.sanitizeOrFallback('Te recomiendo comprar ya.')).toMatch(
      /informacion educativa/i,
    );
  });

  it('rejects empty responses', () => {
    expect(() => service.sanitize('   ')).toThrow(/empty/i);
  });

  it('keeps the fallback text accepted by the sanitizer', () => {
    expect(service.sanitize(ASSISTANT_GUARDRAIL_FALLBACK_TEXT)).toBe(
      ASSISTANT_GUARDRAIL_FALLBACK_TEXT,
    );
  });

  it('truncates very long responses', () => {
    const longText = 'a'.repeat(2_001);
    const sanitized = service.sanitize(longText);

    expect(sanitized.endsWith('...')).toBe(true);
    expect(sanitized.length).toBeLessThanOrEqual(2_000);
  });

  it('sanitizes cached responses through assertResponse', () => {
    const response = service.assertResponse({
      title: 'TER',
      text: '  Explicacion educativa.  ',
      source: 'glossary',
      cached: true,
      disclaimer: 'Educativo.',
      promptVersion: 'sora-v1',
    });

    expect(response.text).toBe('Explicacion educativa.');
  });
});
