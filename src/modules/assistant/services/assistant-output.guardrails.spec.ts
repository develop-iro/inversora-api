import { AssistantOutputGuardrailsService } from './assistant-output.guardrails';

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
  });
});
