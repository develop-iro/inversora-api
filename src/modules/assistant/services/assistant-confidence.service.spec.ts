import type { AssistantPromptContext } from './assistant-context.builder';
import { AssistantConfidenceService } from './assistant-confidence.service';

describe('AssistantConfidenceService', () => {
  const service = new AssistantConfidenceService();

  const baseContext: AssistantPromptContext = {
    surface: 'fund_detail',
    intent: 'explain_score',
    locale: 'es',
    userMessage: 'Explica el score',
    fund: {
      isin: 'IE00B4L5Y983',
      name: 'iShares Core MSCI World',
      benchmark: 'MSCI World',
      ter: 0.2,
      trackingError: 0.1,
      currency: 'EUR',
      vehicle: 'ETF',
      score: 82,
    },
  };

  it('returns full score when guardrails pass and grounding is present', () => {
    const result = service.evaluate({
      text: 'El fondo IE00B4L5Y983 tiene un score de 82 y TER 0.2.',
      intent: 'explain_score',
      context: baseContext,
      guardrailsPass: true,
    });

    expect(result.score).toBe(1);
    expect(result.guardrailsPass).toBe(true);
    expect(result.hasRequiredFundRefs).toBe(true);
    expect(result.responseLengthOk).toBe(true);
  });

  it('returns zero guardrail weight when guardrails fail', () => {
    const result = service.evaluate({
      text: 'Respuesta educativa suficientemente larga para evaluar.',
      intent: 'general',
      context: baseContext,
      guardrailsPass: false,
    });

    expect(result.score).toBe(0.6);
    expect(result.guardrailsPass).toBe(false);
  });

  it('marks short responses as low confidence', () => {
    const result = service.evaluate({
      text: 'Muy corto',
      intent: 'general',
      context: baseContext,
      guardrailsPass: true,
    });

    expect(result.responseLengthOk).toBe(false);
    expect(result.score).toBe(0.75);
  });

  it('requires fund references for explain_score intents', () => {
    const result = service.evaluate({
      text: 'Este texto no menciona métricas del fondo en contexto.',
      intent: 'explain_score',
      context: baseContext,
      guardrailsPass: true,
    });

    expect(result.hasRequiredFundRefs).toBe(false);
    expect(result.score).toBe(0.65);
  });

  it('accepts compare intents when fund name token appears', () => {
    const result = service.evaluate({
      text: 'Comparando iShares frente a otro fondo similar del mercado.',
      intent: 'compare',
      context: {
        surface: 'compare',
        intent: 'compare',
        locale: 'es',
        userMessage: 'Compara fondos',
        funds: [
          {
            isin: 'IE00B4L5Y983',
            name: 'iShares Core MSCI World',
            benchmark: 'MSCI World',
            ter: 0.2,
            trackingError: 0.1,
            currency: 'EUR',
            vehicle: 'ETF',
            score: 82,
          },
        ],
      },
      guardrailsPass: true,
    });

    expect(result.hasRequiredFundRefs).toBe(true);
  });

  it('treats missing fund context as grounded for score intents', () => {
    const result = service.evaluate({
      text: 'Explicación general del score sin fondo en contexto.',
      intent: 'explain_score',
      context: {
        surface: 'fund_detail',
        intent: 'explain_score',
        locale: 'es',
        userMessage: 'Explica el score',
      },
      guardrailsPass: true,
    });

    expect(result.hasRequiredFundRefs).toBe(true);
  });

  it('matches TER and score references in explain_score responses', () => {
    const result = service.evaluate({
      text: 'El fondo muestra un TER de 0.2 y score 82 en la comparativa.',
      intent: 'explain_score',
      context: baseContext,
      guardrailsPass: true,
    });

    expect(result.hasRequiredFundRefs).toBe(true);
    expect(result.score).toBe(1);
  });

  it('matches ISIN references when the fund name token is too short', () => {
    const result = service.evaluate({
      text: 'El fondo IE00B4L5Y983 no incluye el nombre completo.',
      intent: 'explain_score',
      context: {
        ...baseContext,
        fund: {
          ...baseContext.fund!,
          name: 'A',
        },
      },
      guardrailsPass: true,
    });

    expect(result.hasRequiredFundRefs).toBe(true);
  });
});
