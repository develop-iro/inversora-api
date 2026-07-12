import { Test, TestingModule } from '@nestjs/testing';

import type { AssistantPromptContext } from './assistant-context.builder';
import { DeterministicAssistantService } from './deterministic-assistant.service';

describe('DeterministicAssistantService', () => {
  let service: DeterministicAssistantService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [DeterministicAssistantService],
    }).compile();

    service = module.get(DeterministicAssistantService);
  });

  it('builds score explanation from fund context', () => {
    const context: AssistantPromptContext = {
      surface: 'fund-detail',
      intent: 'explain_score',
      locale: 'es',
      userMessage: 'Por que este score',
      fund: {
        isin: 'IE00B4L5Y983',
        name: 'iShares Core MSCI World',
        benchmark: 'MSCI World',
        ter: 0.2,
        trackingError: 0.15,
        currency: 'EUR',
        vehicle: 'ETF',
        score: 78,
        scoreSummary: 'Buen equilibrio entre costes y calidad de datos.',
        scoreBreakdown: {
          ter: {
            points: 32,
            maxPoints: 40,
            label: 'Coste competitivo',
          },
          tracking: {
            points: 30,
            maxPoints: 40,
            label: 'Replica estable',
          },
          aum: {
            points: 8,
            maxPoints: 10,
            label: 'Tamano suficiente',
          },
          age: {
            points: 8,
            maxPoints: 10,
            label: 'Historial amplio',
          },
        },
      },
    };

    const result = service.tryBuild(context, 'explain_score');

    expect(result).not.toBeNull();
    expect(result?.title).toBe('Explicación del Score Inversora');
    expect(result?.text).toContain('78');
    expect(result?.text).toContain('IE00B4L5Y983');
    expect(result?.text).toContain('ter: 32/40');
    expect(result?.text).not.toContain('[object Object]');
  });

  it('builds compare explanation for two funds', () => {
    const context: AssistantPromptContext = {
      surface: 'compare',
      intent: 'compare',
      locale: 'es',
      userMessage: 'Compara fondos',
      funds: [
        {
          isin: 'IE00B4L5Y983',
          name: 'Fondo A',
          benchmark: 'MSCI World',
          ter: 0.2,
          trackingError: 0.1,
          currency: 'EUR',
          vehicle: 'ETF',
          score: 80,
        },
        {
          isin: 'IE00B4L5Y983',
          name: 'Fondo B',
          benchmark: 'MSCI World',
          ter: 0.25,
          trackingError: 0.12,
          currency: 'EUR',
          vehicle: 'ETF',
          score: 72,
        },
      ],
      comparisonHints: {
        isFair: true,
        warnings: [],
      },
    };

    const result = service.tryBuild(context, 'compare');

    expect(result).not.toBeNull();
    expect(result?.text).toContain('Fondo A');
    expect(result?.text).toContain('Fondo B');
  });

  it('returns null for unsupported intents', () => {
    const context: AssistantPromptContext = {
      surface: 'fund-detail',
      intent: 'glossary',
      locale: 'es',
      userMessage: 'Que es TER',
    };

    expect(service.tryBuild(context, 'glossary')).toBeNull();
  });

  it('returns null for score explanation without score data', () => {
    const context: AssistantPromptContext = {
      surface: 'fund-detail',
      intent: 'explain_score',
      locale: 'es',
      userMessage: 'Por que este score',
      fund: {
        isin: 'IE00B4L5Y983',
        name: 'iShares Core MSCI World',
        benchmark: 'MSCI World',
        ter: 0.2,
        trackingError: 0.15,
        currency: 'EUR',
        vehicle: 'ETF',
        score: null,
      },
    };

    expect(service.tryBuild(context, 'explain_score')).toBeNull();
  });

  it('includes warnings and incomplete breakdown markers', () => {
    const context: AssistantPromptContext = {
      surface: 'fund-detail',
      intent: 'explain_score',
      locale: 'es',
      userMessage: 'Por que este score',
      fund: {
        isin: 'IE00B4L5Y983',
        name: 'iShares Core MSCI World',
        benchmark: 'MSCI World',
        ter: 0.2,
        trackingError: 0.15,
        currency: 'EUR',
        vehicle: 'ETF',
        score: 78,
        scoreWarnings: ['Tracking error estimado'],
        scoreBreakdown: {
          ter: {
            points: 32,
            maxPoints: 40,
            label: 'Coste competitivo',
            incomplete: true,
          },
          tracking: {
            points: 30,
            maxPoints: 40,
            label: 'Replica estable',
          },
          aum: {
            points: 8,
            maxPoints: 10,
            label: 'Tamano suficiente',
          },
          age: {
            points: 8,
            maxPoints: 10,
            label: 'Historial amplio',
          },
        },
      },
    };

    const result = service.tryBuild(context, 'explain_score');

    expect(result?.text).toContain('Tracking error estimado');
    expect(result?.text).toContain('incompleto');
  });

  it('uses default score summary copy when scoreSummary is missing', () => {
    const context: AssistantPromptContext = {
      surface: 'fund-detail',
      intent: 'explain_score',
      locale: 'es',
      userMessage: 'Por que este score',
      fund: {
        isin: 'IE00B4L5Y983',
        name: 'iShares Core MSCI World',
        benchmark: 'MSCI World',
        ter: 0.2,
        trackingError: 0.15,
        currency: 'EUR',
        vehicle: 'ETF',
        score: 78,
      },
    };

    const result = service.tryBuild(context, 'explain_score');

    expect(result?.text).toContain('El score resume comisiones');
  });

  it('returns null for compare when fewer than two funds are available', () => {
    const context: AssistantPromptContext = {
      surface: 'compare',
      intent: 'compare',
      locale: 'es',
      userMessage: 'Compara fondos',
      fund: {
        isin: 'IE00B4L5Y983',
        name: 'Fondo A',
        benchmark: 'MSCI World',
        ter: 0.2,
        trackingError: 0.1,
        currency: 'EUR',
        vehicle: 'ETF',
        score: 80,
      },
    };

    expect(service.tryBuild(context, 'compare')).toBeNull();
  });

  it('includes unfair comparison warnings', () => {
    const context: AssistantPromptContext = {
      surface: 'compare',
      intent: 'compare',
      locale: 'es',
      userMessage: 'Compara fondos',
      funds: [
        {
          isin: 'IE00B4L5Y983',
          name: 'Fondo A',
          benchmark: 'MSCI World',
          ter: null,
          trackingError: 0.1,
          currency: 'EUR',
          vehicle: 'ETF',
          score: null,
        },
        {
          isin: 'IE00B4L5Y983',
          name: 'Fondo B',
          benchmark: 'MSCI World',
          ter: 0.25,
          trackingError: 0.12,
          currency: 'EUR',
          vehicle: 'ETF',
          score: 72,
        },
      ],
      comparisonHints: {
        isFair: false,
        warnings: ['Los benchmarks no coinciden.'],
      },
    };

    const result = service.tryBuild(context, 'compare');

    expect(result?.text).toContain('TER no disponible');
    expect(result?.text).toContain('Los benchmarks no coinciden.');
  });
});
