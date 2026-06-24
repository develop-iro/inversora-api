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
  });

  it('classifies explain_score when fund context exists', () => {
    expect(service.classify('¿Por qué tiene este score?', true)).toBe(
      'explain_score',
    );
  });
});
