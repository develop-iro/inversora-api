import { IntentClassifierService } from './intent-classifier.service';

describe('IntentClassifierService', () => {
  const service = new IntentClassifierService();

  it('detects forbidden buy advice', () => {
    expect(service.isForbiddenInput('¿Debería comprar este fondo?')).toBe(true);
  });

  it('detects forbidden ranking modification', () => {
    expect(service.isForbiddenInput('Recalcula el ranking')).toBe(true);
  });

  it('classifies compare intent', () => {
    expect(service.classify('Ayúdame a comparar fondos', false)).toBe(
      'compare',
    );
    expect(service.classify('QQQ vs SPY', false)).toBe('compare');
  });

  it('classifies explain_score when fund context exists', () => {
    expect(service.classify('¿Por qué tiene este score?', true)).toBe(
      'explain_score',
    );
    expect(
      service.classify('Porque este fondo tiene esta puntuacion', true),
    ).toBe('explain_score');
  });

  it('allows educational questions that are not forbidden', () => {
    expect(service.isForbiddenInput('¿Qué es el tracking error?')).toBe(false);
  });

  it('classifies explain_term and general intents', () => {
    expect(service.classify('¿Qué significa volatilidad?', false)).toBe(
      'explain_term',
    );
    expect(service.classify('Hola SORA', false)).toBe('general');
  });

  it('detects forbidden subscription language', () => {
    expect(service.isForbiddenInput('Quiero suscribete al fondo')).toBe(true);
  });

  it('detects additional forbidden patterns', () => {
    expect(service.isForbiddenInput('Invierte ahora en bolsa')).toBe(true);
    expect(service.classify('Diferencia entre SPY y QQQ', false)).toBe(
      'compare',
    );
  });

  it('detects conceptual educational queries', () => {
    expect(service.isConceptualQuery('Como funciona el tracking error')).toBe(
      true,
    );
    expect(service.isConceptualQuery('Hola SORA')).toBe(false);
  });

  it('supports deterministic templates only for score and compare intents', () => {
    expect(service.supportsDeterministicTemplate('explain_score')).toBe(true);
    expect(service.supportsDeterministicTemplate('compare')).toBe(true);
    expect(service.supportsDeterministicTemplate('general')).toBe(false);
  });
});
