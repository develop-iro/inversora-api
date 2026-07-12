import {
  ASSISTANT_GUARDRAIL_FALLBACK_TEXT,
  AssistantOutputGuardrailsService,
} from './assistant-output.guardrails';

describe('AssistantOutputGuardrailsService', () => {
  const service = new AssistantOutputGuardrailsService();

  it('sanitizes valid educational text', () => {
    expect(service.sanitize('El TER mide la comisión anual del fondo.')).toBe(
      'El TER mide la comisión anual del fondo.',
    );
  });

  it('rejects recommendation language', () => {
    expect(() => service.sanitize('Deberías comprar este fondo ya.')).toThrow(
      /prohibited recommendation language/i,
    );
    expect(() => service.sanitize('Te recomiendo este fondo.')).toThrow(
      /prohibited recommendation language/i,
    );
    expect(() => service.sanitize('Es la mejor opción para ti.')).toThrow(
      /prohibited recommendation language/i,
    );
  });

  it('returns a safe fallback when sanitize fails', () => {
    expect(service.sanitizeOrFallback('Te recomiendo comprar ya.')).toMatch(
      /informaci[oó]n educativa/i,
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

    expect(sanitized.endsWith('…')).toBe(true);
    expect(sanitized.length).toBeLessThanOrEqual(2_000);
  });

  it('sanitizes cached responses through assertResponse', () => {
    const response = service.assertResponse({
      title: 'TER',
      text: '  Explicación educativa.  ',
      source: 'glossary',
      cached: true,
      disclaimer: 'Educativo.',
      promptVersion: 'sora-v1',
    });

    expect(response.text).toBe('Explicación educativa.');
  });
});
