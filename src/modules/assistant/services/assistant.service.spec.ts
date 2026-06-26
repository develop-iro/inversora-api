import {
  BadRequestException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';

import { AppConfigService } from '../../../shared/config/config.service';
import type {
  AssistantExplainRequest,
  AssistantIntent,
} from '../entities/assistant-context.schema';
import { AssistantCacheRepository } from '../repositories/assistant-cache.repository';
import { AssistantConversationRepository } from '../repositories/assistant-conversation.repository';
import { AssistantContextBuilderService } from './assistant-context.builder';
import { AssistantOutputGuardrailsService } from './assistant-output.guardrails';
import { AssistantService } from './assistant.service';
import { GlossaryService } from './glossary.service';
import { IntentClassifierService } from './intent-classifier.service';
import { OpenAiAssistantService } from './openai-assistant.service';
import { PythonAgentAssistantService } from './python-agent-assistant.service';

describe('AssistantService', () => {
  let service: AssistantService;
  let config: {
    assistantEnabled: boolean;
    assistantRuntime: 'nestjs' | 'python-agent';
    assistantPromptVersion: string;
    assistantCacheTtlDays: number;
  };
  let cacheRepository: { findValid: jest.Mock; save: jest.Mock };
  let conversationRepository: {
    findRecentMessages: jest.Mock;
    saveTurn: jest.Mock;
  };
  let openAiAssistant: { generate: jest.Mock };
  let pythonAgentAssistant: { generate: jest.Mock };
  let contextBuilder: { build: jest.Mock };

  beforeEach(async () => {
    config = {
      assistantEnabled: false,
      assistantRuntime: 'nestjs',
      assistantPromptVersion: 'sora-v1',
      assistantCacheTtlDays: 90,
    };
    cacheRepository = {
      findValid: jest.fn().mockResolvedValue(null),
      save: jest.fn(),
    };
    conversationRepository = {
      findRecentMessages: jest.fn().mockResolvedValue([]),
      saveTurn: jest.fn(),
    };
    openAiAssistant = {
      generate: jest.fn(),
    };
    pythonAgentAssistant = {
      generate: jest.fn(),
    };
    contextBuilder = {
      build: jest.fn(
        (request: AssistantExplainRequest, intent: AssistantIntent) =>
          Promise.resolve({
            surface: request.surface,
            intent,
            locale: request.locale ?? 'es',
            userMessage: request.message,
          }),
      ),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AssistantService,
        IntentClassifierService,
        GlossaryService,
        AssistantOutputGuardrailsService,
        {
          provide: AppConfigService,
          useValue: config,
        },
        {
          provide: AssistantCacheRepository,
          useValue: cacheRepository,
        },
        {
          provide: AssistantConversationRepository,
          useValue: conversationRepository,
        },
        {
          provide: AssistantContextBuilderService,
          useValue: contextBuilder,
        },
        {
          provide: OpenAiAssistantService,
          useValue: openAiAssistant,
        },
        {
          provide: PythonAgentAssistantService,
          useValue: pythonAgentAssistant,
        },
      ],
    }).compile();

    service = module.get(AssistantService);
  });

  it('returns glossary responses without OpenAI', async () => {
    const response = await service.explain({
      surface: 'home',
      message: '¿Qué es el TER?',
    });

    expect(response.source).toBe('glossary');
    expect(response.title).toBe('TER');
    expect(openAiAssistant.generate).not.toHaveBeenCalled();
  });

  it('rejects forbidden user intents', async () => {
    await expect(
      service.explain({
        surface: 'home',
        message: '¿Debería comprar este fondo?',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('throws when assistant is disabled and glossary misses', async () => {
    await expect(
      service.explain({
        surface: 'home',
        message: 'Explícame MSCI World en detalle educativo',
      }),
    ).rejects.toBeInstanceOf(ServiceUnavailableException);
  });

  it('returns cached responses when available', async () => {
    cacheRepository.findValid.mockResolvedValue({
      text: 'Respuesta cacheada.',
      title: 'Cache',
      source: 'openai',
      cached: false,
      disclaimer: 'Disclaimer',
      promptVersion: 'sora-v1',
    });

    const response = await service.explain({
      surface: 'home',
      message: 'Explícame MSCI World en detalle educativo',
    });

    expect(response.source).toBe('cache');
    expect(response.cached).toBe(true);
  });

  it('generates OpenAI responses when enabled and glossary misses', async () => {
    config.assistantEnabled = true;
    openAiAssistant.generate.mockResolvedValue(
      'MSCI World es un índice global de acciones de mercados desarrollados.',
    );

    const response = await service.explain({
      surface: 'home',
      message: 'Explícame MSCI World en detalle educativo',
    });

    expect(response.source).toBe('openai');
    expect(response.title).toBe('Respuesta de SORA');
    expect(pythonAgentAssistant.generate).not.toHaveBeenCalled();
    expect(cacheRepository.save).toHaveBeenCalled();
  });

  it('generates Python agent responses when configured', async () => {
    config.assistantEnabled = true;
    config.assistantRuntime = 'python-agent';
    pythonAgentAssistant.generate.mockResolvedValue(
      'Respuesta educativa desde el agente Python.',
    );

    const response = await service.explain({
      surface: 'home',
      message: 'ExplÃ­came la diferencia entre dos fondos indexados',
    });

    expect(response.source).toBe('openai');
    expect(openAiAssistant.generate).not.toHaveBeenCalled();
    expect(pythonAgentAssistant.generate).toHaveBeenCalledWith(
      expect.objectContaining({ surface: 'home', intent: 'compare' }),
      'ExplÃ­came la diferencia entre dos fondos indexados',
    );
  });

  it('generates uncached chat responses with selected funds', async () => {
    config.assistantEnabled = true;
    openAiAssistant.generate.mockResolvedValue(
      'Comparacion educativa entre los fondos seleccionados.',
    );

    const response = await service.chat({
      surface: 'compare',
      message: 'Compara estos dos fondos',
      sessionId: 'session-1',
      funds: [{ isin: 'US78462F1030' }, { isin: 'US46090E1038' }],
    });

    expect(response).toMatchObject({
      source: 'openai',
      cached: false,
      sessionId: 'session-1',
      title: 'Cómo comparar fondos en Inversora',
    });
    expect(cacheRepository.findValid).not.toHaveBeenCalled();
    expect(cacheRepository.save).not.toHaveBeenCalled();
    expect(conversationRepository.saveTurn).toHaveBeenCalledWith(
      expect.objectContaining({
        sessionId: 'session-1',
        surface: 'compare',
        locale: 'es',
        userMessage: 'Compara estos dos fondos',
        intent: 'compare',
        runtime: 'nestjs',
        relatedFundIsins: ['US78462F1030', 'US46090E1038'],
      }),
    );
    expect(contextBuilder.build).toHaveBeenCalledWith(
      expect.objectContaining({
        sessionId: 'session-1',
        funds: [{ isin: 'US78462F1030' }, { isin: 'US46090E1038' }],
      }),
      'compare',
      [],
    );
  });

  it('passes recent session messages into chat context', async () => {
    config.assistantEnabled = true;
    const recentMessages = [
      {
        role: 'user',
        content: 'Que es el TER?',
        intent: 'explain_term',
        createdAt: '2026-06-25T08:00:00.000Z',
      },
      {
        role: 'assistant',
        content: 'El TER mide costes anuales.',
        intent: 'explain_term',
        createdAt: '2026-06-25T08:00:01.000Z',
      },
    ];
    conversationRepository.findRecentMessages.mockResolvedValue(recentMessages);
    openAiAssistant.generate.mockResolvedValue('Respuesta con memoria.');

    await service.chat({
      surface: 'home',
      message: 'Y como afecta a largo plazo?',
      sessionId: 'session-1',
    });

    expect(conversationRepository.findRecentMessages).toHaveBeenCalledWith(
      'session-1',
      8,
    );
    expect(contextBuilder.build).toHaveBeenCalledWith(
      expect.objectContaining({ sessionId: 'session-1' }),
      'general',
      recentMessages,
    );
  });

  it('rejects forbidden chat messages', async () => {
    await expect(
      service.chat({
        surface: 'home',
        message: 'Deberia comprar SPY ahora?',
        sessionId: 'session-1',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('returns glossary chat responses without OpenAI', async () => {
    const response = await service.chat({
      surface: 'home',
      message: 'Que es el TER?',
      sessionId: 'session-1',
      locale: 'es',
    });

    expect(response.source).toBe('glossary');
    expect(openAiAssistant.generate).not.toHaveBeenCalled();
    expect(conversationRepository.saveTurn).toHaveBeenCalledWith(
      expect.objectContaining({
        sessionId: 'session-1',
        intent: 'glossary',
        locale: 'es',
      }),
    );
  });

  it('throws when chat misses glossary and assistant is disabled', async () => {
    await expect(
      service.chat({
        surface: 'home',
        message: 'Explícame MSCI World en detalle educativo',
        sessionId: 'session-1',
      }),
    ).rejects.toBeInstanceOf(ServiceUnavailableException);
  });

  it('returns relatedFundIsin for chat requests with a single selected fund', async () => {
    config.assistantEnabled = true;
    openAiAssistant.generate.mockResolvedValue(
      'Explicacion educativa del fondo.',
    );

    const response = await service.chat({
      surface: 'fund_detail',
      message: 'Explicame este fondo',
      sessionId: 'session-1',
      fund: { isin: 'US78462F1030' },
    });

    expect(response.relatedFundIsin).toBe('US78462F1030');
  });

  it('generates a session id for chat responses when the client omits one', async () => {
    config.assistantEnabled = true;
    openAiAssistant.generate.mockResolvedValue('Respuesta educativa.');

    const response = await service.chat({
      surface: 'home',
      message: 'Pregunta general sobre fondos indexados',
    });

    expect(response.sessionId).toMatch(/^sora_/);
    expect(conversationRepository.saveTurn).toHaveBeenCalledWith(
      expect.objectContaining({
        sessionId: response.sessionId,
        userMessage: 'Pregunta general sobre fondos indexados',
      }),
    );
  });

  it('builds compare and score titles for OpenAI responses', async () => {
    config.assistantEnabled = true;
    openAiAssistant.generate.mockResolvedValue('Texto educativo.');

    const compareResponse = await service.explain({
      surface: 'compare',
      message: 'SPY versus QQQ para aprender diferencias',
    });
    const scoreResponse = await service.explain({
      surface: 'fund_detail',
      message: 'Por que este fondo aparece asi',
      fund: { isin: 'US78462F1030' },
    });

    expect(compareResponse.title).toBe('Cómo comparar fondos en Inversora');
    expect(scoreResponse.title).toBe('Explicación del Score Inversora');
  });

  it('capitalizes question titles for OpenAI responses', async () => {
    config.assistantEnabled = true;
    openAiAssistant.generate.mockResolvedValue('Texto educativo.');

    const response = await service.explain({
      surface: 'home',
      message: 'como funciona esto?',
    });

    expect(response.title).toBe('Como funciona esto?');
  });

  it('persists locale and related fund ISIN in OpenAI responses', async () => {
    config.assistantEnabled = true;
    openAiAssistant.generate.mockResolvedValue('Texto educativo.');

    const response = await service.explain({
      surface: 'fund_detail',
      message: 'SPY versus QQQ para aprender diferencias',
      locale: 'en',
      fund: { isin: 'US78462F1030' },
    });

    expect(response.relatedFundIsin).toBe('US78462F1030');
    expect(cacheRepository.save).toHaveBeenCalledWith(
      expect.objectContaining({ locale: 'en', fundIsin: 'US78462F1030' }),
    );
  });
});
